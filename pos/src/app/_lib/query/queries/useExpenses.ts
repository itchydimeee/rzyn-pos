import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";

export interface ExpenseItem {
  id: string;
  type: string;
  amount: number;
  note: string;
  createdAt: string;
  cashier: { username: string };
  expenseDelivery?: {
    quantityDelivered: number;
    variant: { name: string; product: { name: string } };
  } | null;
}

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses.all,
    queryFn: () => fetcher.get<ExpenseItem[]>("/api/expenses"),
    staleTime: 10_000,
  });
}
