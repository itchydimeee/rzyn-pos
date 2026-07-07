import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";
import type { Product } from "../queries/useAdminProducts";

interface VariantInput {
  id?: string;
  name: string;
  sellPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  barcode?: string;
  wholesalePrice?: number | null;
  wholesaleThreshold?: number | null;
}

interface UpdateProductVars {
  id: string;
  data: {
    name: string;
    category: string;
    variants: VariantInput[];
  };
}

export function useUpdateProduct(onSuccess?: () => void, onRollback?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);

  return useMutation({
    mutationFn: ({ id, data }: UpdateProductVars) =>
      fetcher.put<Product>(`/api/admin/products/${id}`, data),
    onMutate: async ({ id, data: updatedData }) => {
      toastId.current = toast.loading("Updating product...");
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.products.all });

      const previousAll = queryClient.getQueryData<Product[]>(queryKeys.admin.products.all);
      const previousById = queryClient.getQueryData<Product>(queryKeys.admin.products.byId(id));

      const optimisticProduct: Product = {
        id,
        name: updatedData.name,
        category: updatedData.category,
        isActive: true,
        variants: updatedData.variants.map((v, i) => ({
          id: v.id || `temp-v-${i}`,
          name: v.name,
          sellPrice: v.sellPrice,
          costPrice: v.costPrice,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
          barcode: v.barcode || null,
          wholesalePrice: v.wholesalePrice ?? null,
          wholesaleThreshold: v.wholesaleThreshold ?? null,
        })),
      };

      queryClient.setQueryData<Product[]>(queryKeys.admin.products.all, (old) =>
        old?.map((p) => (p.id === id ? optimisticProduct : p))
      );
      queryClient.setQueryData<Product>(queryKeys.admin.products.byId(id), optimisticProduct);

      return { previousAll, previousById };
    },
    onError: (_err, vars, context) => {
      queryClient.setQueryData(queryKeys.admin.products.all, context?.previousAll);
      if (context?.previousById) {
        queryClient.setQueryData(queryKeys.admin.products.byId(vars.id), context.previousById);
      }
      toast.error("Failed to update product", { id: toastId.current });
      onRollback?.();
    },
    onSuccess: () => {
      toast.success("Product updated", { id: toastId.current });
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
