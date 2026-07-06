import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";

export interface Cashier {
  id: string;
  username: string;
  code: string;
  stockPermission: boolean;
  isActive: boolean;
}

export function useCashiers() {
  return useQuery({
    queryKey: queryKeys.admin.cashiers.all,
    queryFn: () => fetcher.get<Cashier[]>("/api/admin/cashiers"),
    staleTime: 30_000,
  });
}
