import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";

interface BulkCreateResponse {
  created: boolean;
  productsCount: number;
  variantsCount: number;
}

export function useBulkCreateProducts(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const toastId = useRef<string | number>(0);

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        body: formData,
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || `Upload failed: ${res.status}`);
      }

      return body as BulkCreateResponse;
    },
    onMutate: () => {
      toastId.current = toast.loading("Uploading products...");
    },
    onError: (err: Error) => {
      toast.error(err.message, { id: toastId.current });
    },
    onSuccess: (data) => {
      toast.success(`Created ${data.productsCount} products with ${data.variantsCount} variants`, {
        id: toastId.current,
      });
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
