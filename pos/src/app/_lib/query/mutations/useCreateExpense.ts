"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";
import { offlineDB } from "@/lib/db";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { ExpenseItem } from "../queries/useExpenses";

interface ExpensePayload {
  type: string;
  amount: number;
  note: string;
  deliveryVariantId?: string;
  deliveryQuantity?: number;
}

export function useCreateExpense(onSuccess?: () => void, onRollback?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);
  const { status: onlineStatus, refreshPending } = useOnlineStatus();

  return useMutation({
    mutationFn: async (payload: ExpensePayload) => {
      try {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to save");
        return res.json();
      } catch (err) {
        if (onlineStatus === "offline" || (err instanceof TypeError)) {
          await offlineDB.pendingActions.add({
            type: "expense",
            payload: payload as unknown as Record<string, unknown>,
            createdAt: Date.now(),
          });
          await refreshPending();
          return { offline: true };
        }
        throw err;
      }
    },

    onMutate: async (newExpense) => {
      toastId.current = toast.loading("Saving expense...");
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all });

      const previous = queryClient.getQueryData<ExpenseItem[]>(queryKeys.expenses.all);

      queryClient.setQueryData<ExpenseItem[]>(queryKeys.expenses.all, (old) => {
        const optimistic: ExpenseItem = {
          id: `temp-${Date.now()}`,
          type: newExpense.type,
          amount: newExpense.amount,
          note: newExpense.note,
          createdAt: new Date().toISOString(),
          cashier: { username: "" },
        };
        return old ? [optimistic, ...old] : [optimistic];
      });

      if (newExpense.type === "delivery" && newExpense.deliveryVariantId && newExpense.deliveryQuantity) {
        queryClient.setQueryData(queryKeys.products.all, (old: unknown) => {
          if (!old || !Array.isArray(old)) return old;
          return (old as Array<{ id: string; variants: Array<{ id: string; stock: number }> }>).map((p) => ({
            ...p,
            variants: p.variants.map((v) =>
              v.id === newExpense.deliveryVariantId
                ? { ...v, stock: v.stock + (newExpense.deliveryQuantity || 0) }
                : v
            ),
          }));
        });
      }

      return { previous };
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.expenses.all, context?.previous);
      toast.error("Failed to save expense", { id: toastId.current });
      onRollback?.();
    },

    onSuccess: (data) => {
      const msg = data?.offline ? "Expense queued — will sync when online" : "Expense saved";
      toast.success(msg, { id: toastId.current });
      onSuccess?.();
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.stocks.all });
    },
  });
}
