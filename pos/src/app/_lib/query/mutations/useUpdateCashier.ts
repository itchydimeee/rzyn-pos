import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";
import type { Cashier } from "../queries/useCashiers";

type UpdateCashierVars = {
  id: string;
  code?: string;
  stockPermission?: boolean;
  isActive?: boolean;
};

export function useUpdateCashier(onSuccess?: (vars: UpdateCashierVars) => void, onRollback?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCashierVars) =>
      fetcher.put<{ success: boolean }>(`/api/admin/cashiers/${id}`, data),
    onMutate: async (vars) => {
      toastId.current = toast.loading("Updating...");
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.cashiers.all });

      const previous = queryClient.getQueryData<Cashier[]>(queryKeys.admin.cashiers.all);

      queryClient.setQueryData<Cashier[]>(queryKeys.admin.cashiers.all, (old) =>
        old?.map((c) => {
          if (c.id !== vars.id) return c;
          const updated = { ...c };
          if (vars.code !== undefined) updated.code = vars.code;
          if (vars.stockPermission !== undefined) updated.stockPermission = vars.stockPermission;
          if (vars.isActive !== undefined) updated.isActive = vars.isActive;
          return updated;
        })
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.admin.cashiers.all, context?.previous);
      toast.error("Update failed", { id: toastId.current });
      onRollback?.();
    },
    onSuccess: (_data, vars) => {
      const msg = vars.code
        ? "Passcode reset"
        : vars.stockPermission !== undefined
          ? "Stock permission updated"
          : vars.isActive ? "Cashier reactivated" : "Cashier deactivated";
      toast.success(msg, { id: toastId.current });
      onSuccess?.(vars);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.cashiers.all });
    },
  });
}
