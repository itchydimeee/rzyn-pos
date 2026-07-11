"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";
import { offlineDB } from "@/lib/db";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface CheckoutItem {
  variantId: string;
  quantity: number;
}

interface CheckoutPayload {
  items: CheckoutItem[];
  paymentType: "cash" | "gcash" | "credit";
  customerName?: string;
  customerPhone?: string;
  memberId?: string;
}

export interface ReceiptItem {
  productName: string;
  variantName: string;
  quantity: number;
  priceAtSale: number;
  lineTotal: number;
}

export interface CheckoutResponse {
  success: boolean;
  transactionId: string;
  orNumber: string;
  total: number;
  createdAt: string;
  paymentType: string;
  items: ReceiptItem[];
  customerName?: string;
  customerPhone?: string;
  creditPaymentId?: string;
  offline?: boolean;
}

export function useCheckout(onSuccess?: (data: CheckoutResponse) => void, onRollback?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);
  const { status: onlineStatus, refreshPending } = useOnlineStatus();

  return useMutation({
    mutationFn: async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Checkout failed");
        }
        return res.json();
      } catch (err) {
        if (onlineStatus === "offline" || (err instanceof TypeError)) {
          await offlineDB.pendingActions.add({
            type: "checkout",
            payload: payload as unknown as Record<string, unknown>,
            createdAt: Date.now(),
          });
          await refreshPending();
          return { offline: true } as CheckoutResponse;
        }
        throw err;
      }
    },

    onMutate: async ({ items, paymentType }) => {
      toastId.current = toast.loading("Processing sale...");
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all });

      const previousProducts = queryClient.getQueryData(queryKeys.products.all);

      queryClient.setQueryData(queryKeys.products.all, (old: unknown) => {
        if (!old || !Array.isArray(old)) return old;
        return (old as Array<{ id: string; variants: Array<{ id: string; stock: number }> }>).map((p) => {
          const hasMatch = p.variants?.some((v) => items.some((i) => i.variantId === v.id));
          if (!hasMatch) return p;
          return {
            ...p,
            variants: p.variants.map((v) => {
              const match = items.find((i) => i.variantId === v.id);
              if (!match) return v;
              return { ...v, stock: v.stock - match.quantity };
            }),
          };
        });
      });

      return { previousProducts };
    },

    onError: (err, _vars, context) => {
      queryClient.setQueryData(queryKeys.products.all, context?.previousProducts);
      toast.error((err as Error).message || "Checkout failed", { id: toastId.current });
    },

    onSuccess: (data) => {
      const msg = data.offline
        ? `Sale queued — will sync when online`
        : `Sale completed`;
      toast.success(msg, { id: toastId.current });
      if (onSuccess) onSuccess(data);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.stocks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.all });
    },
  });
}
