import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";
import type { Product } from "../queries/useAdminProducts";

export function useDeleteProduct(onRollback?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);

  return useMutation({
    mutationFn: (id: string) => fetcher.del<{ success: boolean }>(`/api/admin/products/${id}`),
    onMutate: async (id) => {
      toastId.current = toast.loading("Deleting product...");
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.products.all });

      const previous = queryClient.getQueryData<Product[]>(queryKeys.admin.products.all);

      queryClient.setQueryData<Product[]>(queryKeys.admin.products.all, (old) =>
        old?.filter((p) => p.id !== id)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.admin.products.all, context?.previous);
      toast.error("Failed to delete product", { id: toastId.current });
      onRollback?.();
    },
    onSuccess: () => {
      toast.success("Product deleted", { id: toastId.current });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
