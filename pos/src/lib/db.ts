import Dexie, { type Table } from "dexie";

export interface CachedProduct {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  variants: { id: string; name: string; sellPrice: number; costPrice: number; stock: number; lowStockThreshold: number; wholesalePrice?: number | null; wholesaleThreshold?: number | null }[];
}

export interface PendingAction {
  id?: number;
  type: "checkout" | "expense" | "stockEdit";
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface SyncMeta {
  key: string;
  value: string;
}

class PosOfflineDB extends Dexie {
  products!: Table<CachedProduct, string>;
  pendingActions!: Table<PendingAction, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super("pos-offline");
    this.version(1).stores({
      products: "id",
      pendingActions: "++id, type, createdAt",
      syncMeta: "key",
    });
  }
}

export const offlineDB = new PosOfflineDB();
