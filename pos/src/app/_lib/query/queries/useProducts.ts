import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { fetcher } from "../fetcher";
import type { CachedProduct } from "@/lib/db";

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: () => fetcher.get<CachedProduct[]>("/api/products"),
    staleTime: 15_000,
  });
}
