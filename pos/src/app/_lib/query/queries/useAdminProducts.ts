import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";

export interface Variant {
  id: string;
  name: string;
  sellPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  barcode?: string | null;
  wholesalePrice?: number | null;
  wholesaleThreshold?: number | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  variants: Variant[];
}

export function useAdminProducts() {
  return useQuery({
    queryKey: queryKeys.admin.products.all,
    queryFn: () => fetcher.get<Product[]>("/api/admin/products"),
    staleTime: 30_000,
  });
}
