import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";

export interface CreditPaymentItem {
  id: string;
  transactionId: string;
  customerName: string;
  customerPhone: string;
  member: { id: string; name: string; phone: string } | null;
  amount: number;
  status: string;
  daysSinceCreation: number;
  weeksOverdue: number;
  interest: number;
  totalDue: number;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export function useCredits(status?: string) {
  return useQuery({
    queryKey: queryKeys.credits.byStatus(status),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      return fetcher.get<CreditPaymentItem[]>(`/api/admin/credits?${params}`);
    },
    staleTime: 15_000,
  });
}
