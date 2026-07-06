import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";

interface ReportData {
  totalSales: number;
  totalProfit: number;
  totalExpenses: number;
  expenseByType: Record<string, number>;
  cashSales: number;
  gcashSales: number;
  transactionCount: number;
}

export function useReports(filter: string, date: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.reports.withParams(filter, date),
    queryFn: async () => {
      const params = new URLSearchParams({ filter, date });
      return fetcher.get<ReportData>(`/api/admin/reports?${params}`);
    },
    enabled,
    staleTime: 0,
  });
}
