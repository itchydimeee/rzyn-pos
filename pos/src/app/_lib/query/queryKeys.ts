export const queryKeys = {
  products: {
    all: ["products"] as const,
  },
  admin: {
    products: {
      all: ["admin", "products"] as const,
      byId: (id: string) => ["admin", "products", id] as const,
    },
    cashiers: {
      all: ["admin", "cashiers"] as const,
      byId: (id: string) => ["admin", "cashiers", id] as const,
    },
    dashboard: ["admin", "dashboard"] as const,
  },
  expenses: {
    all: ["expenses"] as const,
    byDateRange: (from: string, to: string) => ["expenses", from, to] as const,
  },
  stocks: {
    all: ["stocks"] as const,
  },
  stockLogs: {
    all: ["stockLogs"] as const,
    byVariant: (variantId: string) => ["stockLogs", variantId] as const,
  },
  reports: {
    all: ["reports"] as const,
    withParams: (filter: string, date: string) => ["reports", filter, date] as const,
  },
  transactions: {
    all: ["transactions"] as const,
  },
} as const;
