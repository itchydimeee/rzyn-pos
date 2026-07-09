"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../queryKeys";

export function useResolveCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/credits/${id}`, {
        method: "PUT",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to resolve credit");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Credit payment resolved");
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
