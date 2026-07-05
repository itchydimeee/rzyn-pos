"use client";

import { useEffect, useState, useCallback } from "react";
import { offlineDB, type CachedProduct } from "@/lib/db";

export function useProductCache() {
  const [products, setProducts] = useState<CachedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const mergeCacheWithAPI = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const apiProducts: CachedProduct[] = await res.json();
        await offlineDB.products.clear();
        await offlineDB.products.bulkAdd(
          apiProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            isActive: p.isActive,
            variants: p.variants.map((v) => ({
              id: v.id,
              name: v.name,
              sellPrice: v.sellPrice,
              costPrice: v.costPrice,
              stock: v.stock,
              lowStockThreshold: v.lowStockThreshold,
            })),
          }))
        );
        setProducts(apiProducts);
        const now = new Date().toISOString();
        await offlineDB.syncMeta.put({ key: "lastProductSync", value: now });
        setLastSync(now);
        return;
      }
    } catch {}
    const cached = await offlineDB.products.toArray();
    if (cached.length > 0) setProducts(cached);
    const meta = await offlineDB.syncMeta.get("lastProductSync");
    if (meta) setLastSync(meta.value);
  }, []);

  const loadFromCache = useCallback(async () => {
    const cached = await offlineDB.products.toArray();
    if (cached.length > 0) setProducts(cached);
    const meta = await offlineDB.syncMeta.get("lastProductSync");
    if (meta) setLastSync(meta.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFromCache().then(() => mergeCacheWithAPI());
  }, [loadFromCache, mergeCacheWithAPI]);

  const updateLocalStock = useCallback(
    async (variantId: string, delta: number) => {
      setProducts((prev) =>
        prev.map((p) => {
          const variantMatch = p.variants.some((v) => v.id === variantId);
          if (!variantMatch) return p;
          return {
            ...p,
            variants: p.variants.map((v) =>
              v.id === variantId ? { ...v, stock: v.stock + delta } : v
            ),
          };
        })
      );
      const cachedProducts = await offlineDB.products.toArray();
      for (const p of cachedProducts) {
        const vdx = p.variants.findIndex((v) => v.id === variantId);
        if (vdx !== -1) {
          p.variants[vdx].stock += delta;
          await offlineDB.products.put(p);
          break;
        }
      }
    },
    []
  );

  return { products, loading, lastSync, refresh: mergeCacheWithAPI, updateLocalStock };
}
