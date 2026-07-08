import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";

export interface ExpenseDeliveryItem {
  quantityDelivered: number;
  variant: { name: string; product: { name: string } };
}

export interface ExpenseItem {
  id: string;
  name: string;
  type: string;
  amount: number;
  note: string;
  createdAt: string;
  cashier: { username: string };
  expenseDeliveries: ExpenseDeliveryItem[];
}

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses.all,
    queryFn: () => fetcher.get<ExpenseItem[]>("/api/expenses"),
    staleTime: 10_000,
  });
}
