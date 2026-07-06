import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";
import type { Product } from "../queries/useAdminProducts";

interface VariantInput {
  name: string;
  sellPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  barcode?: string;
}

interface CreateProductInput {
  name: string;
  category: string;
  variants: VariantInput[];
}

export function useCreateProduct(onSuccess?: () => void, onRollback?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);

  return useMutation({
    mutationFn: (data: CreateProductInput) =>
      fetcher.post<Product>("/api/admin/products", data),
    onMutate: async (newProduct) => {
      toastId.current = toast.loading("Adding product...");
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.products.all });

      const previous = queryClient.getQueryData<Product[]>(queryKeys.admin.products.all);

      queryClient.setQueryData<Product[]>(queryKeys.admin.products.all, (old) => {
        if (!old) return [{ ...newProduct, id: `temp-${Date.now()}`, isActive: true, variants: [] } as unknown as Product];
        return [...old, {
          ...newProduct,
          id: `temp-${Date.now()}`,
          isActive: true,
          variants: newProduct.variants.map((v, i) => ({ ...v, id: `temp-v-${i}` })),
        } as unknown as Product];
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeys.admin.products.all, context?.previous);
      toast.error("Failed to add product", { id: toastId.current });
      onRollback?.();
    },
    onSuccess: () => {
      toast.success("Product added", { id: toastId.current });
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
