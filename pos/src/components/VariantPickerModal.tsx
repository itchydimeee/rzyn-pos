"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface VariantPickerModalProps {
  open: boolean;
  onClose: () => void;
  product: {
    name: string;
    variants: Array<{
      id: string;
      name: string;
      sellPrice: number;
      wholesalePrice?: number | null;
      wholesaleThreshold?: number | null;
    }>;
  };
  onAddToCart: (variant: { id: string; name: string; sellPrice: number; wholesalePrice?: number | null; wholesaleThreshold?: number | null }, quantity: number) => void;
}

export function VariantPickerModal({ open, onClose, product, onAddToCart }: VariantPickerModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!open) return null;

  function getQuantity(variantId: string) {
    return quantities[variantId] ?? 1;
  }

  function getEffectivePrice(v: typeof product.variants[number]) {
    const qty = getQuantity(v.id);
    if (v.wholesalePrice != null && v.wholesaleThreshold != null && qty >= v.wholesaleThreshold) {
      return { price: v.wholesalePrice, isWholesale: true as const };
    }
    return { price: v.sellPrice, isWholesale: false as const };
  }

  function updateQuantity(variantId: string, delta: number) {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: Math.max(1, (prev[variantId] ?? 1) + delta),
    }));
  }

  const overallTotal = product.variants.reduce(
    (sum, v) => sum + getEffectivePrice(v).price * getQuantity(v.id),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-[600px] max-w-[95vw] p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold mb-4">{product.name} - Select Variant</h3>

        <div className="grid grid-cols-2 gap-3">
          {product.variants.map((v) => {
            const qty = getQuantity(v.id);
            const { price: effectivePrice, isWholesale } = getEffectivePrice(v);
            const lineTotal = effectivePrice * qty;
            const isMin = qty <= 1;
            const hasWholesale = v.wholesalePrice != null && v.wholesaleThreshold != null;

            return (
              <div key={v.id} className="border rounded-lg p-3 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm leading-tight">{v.name}</span>
                  <div className="text-right shrink-0">
                    <span className={`text-xs ${isWholesale ? "text-gray-300 line-through" : "text-gray-400"}`}>
                      {formatCurrency(v.sellPrice)}
                    </span>
                    {isWholesale && (
                      <span className="text-xs text-amber-600 block">{formatCurrency(effectivePrice)}</span>
                    )}
                  </div>
                </div>

                {hasWholesale && !isWholesale && (
                  <div className="text-xs text-amber-600 mb-2">
                    Buy ≥{v.wholesaleThreshold} for {formatCurrency(v.wholesalePrice!)} each
                  </div>
                )}
                {isWholesale && (
                  <div className="text-xs text-amber-600 font-medium mb-2">
                    Wholesale price active!
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(v.id, -1)}
                      disabled={isMin}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className={`w-7 text-center font-medium text-sm ${isWholesale ? "text-amber-600" : ""}`}>{qty}</span>
                    <button
                      onClick={() => updateQuantity(v.id, 1)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className={`font-bold text-sm ${isWholesale ? "text-amber-600" : "text-green-600"}`}>
                    {formatCurrency(lineTotal)}
                  </span>
                </div>

                <button
                  onClick={() => {
                    onAddToCart({ id: v.id, name: v.name, sellPrice: v.sellPrice, wholesalePrice: v.wholesalePrice, wholesaleThreshold: v.wholesaleThreshold }, qty);
                    onClose();
                  }}
                  className="mt-2 w-full py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Add to Cart
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t flex justify-between font-semibold text-sm">
          <span>Total</span>
          <span className="text-green-600">{formatCurrency(overallTotal)}</span>
        </div>
      </div>
    </div>
  );
}
