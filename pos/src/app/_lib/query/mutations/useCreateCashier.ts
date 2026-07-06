import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";
import type { Cashier } from "../queries/useCashiers";

interface CreateCashierInput {
  username: string;
  code: string;
}

export function useCreateCashier(onSuccess?: () => void, onRollback?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);

  return useMutation({
    mutationFn: (data: CreateCashierInput) =>
      fetcher.post<Cashier>("/api/admin/cashiers", data),
    onMutate: async (newCashier) => {
      toastId.current = toast.loading("Adding cashier...");
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.cashiers.all });

      const previous = queryClient.getQueryData<Cashier[]>(queryKeys.admin.cashiers.all);

      queryClient.setQueryData<Cashier[]>(queryKeys.admin.cashiers.all, (old) => {
        if (!old) return [{ ...newCashier, id: `temp-${Date.now()}`, stockPermission: false, isActive: true } as Cashier];
        return [...old, { ...newCashier, id: `temp-${Date.now()}`, stockPermission: false, isActive: true } as Cashier];
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.admin.cashiers.all, context?.previous);
      toast.error("Failed to add cashier", { id: toastId.current });
      onRollback?.();
    },
    onSuccess: () => {
      toast.success("Cashier added", { id: toastId.current });
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.cashiers.all });
    },
  });
}
