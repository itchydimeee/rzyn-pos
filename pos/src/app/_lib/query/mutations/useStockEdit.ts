"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";
import { offlineDB } from "@/lib/db";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { StockLogItem } from "../queries/useStockLogs";

interface StockEditPayload {
  variantId: string;
  changeAmount: number;
  reason: string;
}

export function useStockEdit(onSuccess?: () => void, onRollback?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);
  const { status: onlineStatus, refreshPending } = useOnlineStatus();

  return useMutation({
    mutationFn: async (payload: StockEditPayload) => {
      try {
        const res = await fetch("/api/stocks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
      } catch (err) {
        if (onlineStatus === "offline" || (err instanceof TypeError)) {
          await offlineDB.pendingActions.add({
            type: "stockEdit",
            payload: payload as unknown as Record<string, unknown>,
            createdAt: Date.now(),
          });
          await refreshPending();
          return { offline: true };
        }
        throw err;
      }
    },

    onMutate: async ({ variantId, changeAmount, reason }) => {
      toastId.current = toast.loading("Updating stock...");
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.stockLogs.all });

      const previousProducts = queryClient.getQueryData(queryKeys.products.all);
      const previousLogs = queryClient.getQueryData<StockLogItem[]>(queryKeys.stockLogs.all);

      queryClient.setQueryData(queryKeys.products.all, (old: unknown) => {
        if (!old || !Array.isArray(old)) return old;
        return (old as Array<{ id: string; variants: Array<{ id: string; stock: number }> }>).map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.id === variantId ? { ...v, stock: v.stock + changeAmount } : v
          ),
        }));
      });

      if (previousLogs) {
        const optimisticLog: StockLogItem = {
          id: `temp-log-${Date.now()}`,
          changeAmount,
          reason,
          createdAt: new Date().toISOString(),
          user: { username: "" },
          variant: { name: "", product: { name: "" } },
        };
        queryClient.setQueryData<StockLogItem[]>(queryKeys.stockLogs.all, [optimisticLog, ...previousLogs]);
      }

      return { previousProducts, previousLogs };
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.products.all, context?.previousProducts);
      queryClient.setQueryData(queryKeys.stockLogs.all, context?.previousLogs);
      toast.error("Failed to update stock", { id: toastId.current });
      onRollback?.();
    },

    onSuccess: (data, { changeAmount }) => {
      const msg = data?.offline
        ? `Stock queued: ${changeAmount > 0 ? "+" : ""}${changeAmount}`
        : `Stock updated: ${changeAmount > 0 ? "+" : ""}${changeAmount}`;
      toast.success(msg, { id: toastId.current });
      onSuccess?.();
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stocks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockLogs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
    },
  });
}
