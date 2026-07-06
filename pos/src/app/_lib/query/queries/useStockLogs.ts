import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";

export interface StockLogItem {
  id: string;
  changeAmount: number;
  reason: string;
  createdAt: string;
  user: { username: string };
  variant: { name: string; product: { name: string } };
}

export function useStockLogs() {
  return useQuery({
    queryKey: queryKeys.stockLogs.all,
    queryFn: async () => {
      const data = await fetcher.get<{ stockLogs: StockLogItem[] }>("/api/stocks");
      return data.stockLogs || [];
    },
    staleTime: 15_000,
  });
}
