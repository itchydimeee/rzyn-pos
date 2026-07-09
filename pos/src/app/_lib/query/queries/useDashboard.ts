import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";

interface DashboardData {
  todaySales: number;
  todayProfit: number;
  todayExpenses: number;
  salesChart: { date: string; total: number }[];
  topProducts: { name: string; variantName: string; totalSold: number }[];
  lowStock: { id: string; productName: string; variantName: string; stock: number; threshold: number }[];
  outstandingCredits: number;
  outstandingCreditsCount: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: () => fetcher.get<DashboardData>("/api/admin/dashboard"),
    staleTime: 30_000,
  });
}
