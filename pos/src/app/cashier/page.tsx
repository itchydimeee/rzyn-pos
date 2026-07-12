"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { VariantPickerModal } from "@/components/VariantPickerModal";
import { GcashQrModal } from "@/components/GcashQrModal";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { formatCurrency } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useProductCache } from "@/hooks/useProductCache";
import { useProducts } from "@/app/_lib/query/queries/useProducts";
import { useCheckout, CheckoutResponse } from "@/app/_lib/query/mutations/useCheckout";
import { Spinner } from "@/app/_lib/query/Spinner";
import { PhoneInput } from "@/components/PhoneInput";
import { printReceipt } from "@/lib/printReceipt";
import type { ReceiptData } from "@/components/Receipt";

interface CartItem {
  variantId: string;
  productName: string;
  variantName: string;
  price: number;
  quantity: number;
  appliedPrice: number;
  wholesalePrice: number | null;
  wholesaleThreshold: number | null;
  wholesaleActive: boolean;
}

export default function CashierPOSPage() {
  const { data: apiProducts = [], isLoading } = useProducts();
  const { lastSync } = useProductCache();
  const { status } = useOnlineStatus();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "gcash" | "credit">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+63 ");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showGcashQr, setShowGcashQr] = useState(false);

  const printModeRef = useRef(false);

  const checkout = useCheckout(
    (data: CheckoutResponse) => {
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setMemberId(null);
      setShowCheckoutConfirm(false);
      if (!data.offline && printModeRef.current) {
        printReceipt({
          orNumber: data.orNumber,
          createdAt: data.createdAt,
          paymentType: data.paymentType as ReceiptData["paymentType"],
          items: data.items,
          total: data.total,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
        });
      }
    },
    () => setShowCheckoutConfirm(true),
  );

  useEffect(() => {
    fetch("/api/admin/members")
      .then((r) => r.json())
      .then(setMembers)
      .catch(() => {});
  }, []);

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.phone && m.phone.includes(q))
    );
  }, [members, memberSearch]);

  function selectMember(member: { id: string; name: string; phone: string }) {
    setMemberId(member.id);
    setCustomerName(member.name);
    setCustomerPhone(member.phone);
    setMemberSearch("");
    setShowMemberDropdown(false);
  }

  const filtered = apiProducts.filter(
    (p) =>
      p.isActive !== false &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()))
  );

  function getSelectedProduct() {
    return apiProducts.find((p) => p.id === selectedProduct) || null;
  }

  function handleProductClick(productId: string) {
    const product = apiProducts.find((p) => p.id === productId);
    if (!product) return;
    if (product.variants.length === 1) {
      const v = product.variants[0];
      addToCart(v, product.name);
    } else {
      setSelectedProduct(productId);
      setShowVariantPicker(true);
    }
  }

  function computeAppliedPrice(
    price: number,
    qty: number,
    wholesalePrice: number | null | undefined,
    wholesaleThreshold: number | null | undefined,
  ) {
    if (wholesalePrice != null && wholesaleThreshold != null && qty >= wholesaleThreshold) {
      return { appliedPrice: wholesalePrice, wholesaleActive: true };
    }
    return { appliedPrice: price, wholesaleActive: false };
  }

  function addToCart(
    variant: { id: string; name: string; sellPrice: number; wholesalePrice?: number | null; wholesaleThreshold?: number | null },
    productName: string,
    quantity: number = 1,
  ) {
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        const { appliedPrice, wholesaleActive } = computeAppliedPrice(variant.sellPrice, newQty, variant.wholesalePrice, variant.wholesaleThreshold);
        return prev.map((i) =>
          i.variantId === variant.id ? { ...i, quantity: newQty, appliedPrice, wholesaleActive } : i
        );
      }
      const { appliedPrice, wholesaleActive } = computeAppliedPrice(variant.sellPrice, quantity, variant.wholesalePrice, variant.wholesaleThreshold);
      return [...prev, {
        variantId: variant.id, productName, variantName: variant.name,
        price: variant.sellPrice, quantity,
        appliedPrice, wholesaleActive,
        wholesalePrice: variant.wholesalePrice ?? null,
        wholesaleThreshold: variant.wholesaleThreshold ?? null,
      }];
    });
    setShowVariantPicker(false);
    setSelectedProduct(null);
  }

  function updateQuantity(variantId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.variantId !== variantId) return i;
          const newQty = Math.max(0, i.quantity + delta);
          const { appliedPrice, wholesaleActive } = computeAppliedPrice(i.price, newQty, i.wholesalePrice, i.wholesaleThreshold);
          return { ...i, quantity: newQty, appliedPrice, wholesaleActive };
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(variantId: string) {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  const total = cart.reduce((s, i) => s + i.appliedPrice * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  function handleCheckoutClick() {
    if (paymentType === "gcash") {
      setShowGcashQr(true);
    } else {
      setShowCheckoutConfirm(true);
    }
  }

  function handleGcashConfirm() {
    setShowGcashQr(false);
    setShowCheckoutConfirm(true);
  }

  function handleCheckout(shouldPrint: boolean) {
    printModeRef.current = shouldPrint;
    const payload: any = {
      items: cart.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      paymentType,
    };
    if (paymentType === "credit") {
      payload.customerName = customerName;
      if (customerPhone) payload.customerPhone = customerPhone;
      if (memberId) payload.memberId = memberId;
    }
    checkout.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="loader" /></div>;

  const selected = getSelectedProduct();
  const isPending = checkout.isPending;

  const checkoutSummary = (
    <div>
      {paymentType === "gcash" && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          GCash payment confirmed via QR
        </div>
      )}
      <div className="border rounded-lg divide-y text-sm">
        {cart.map((item) => (
          <div key={item.variantId} className="flex justify-between items-center px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{item.productName} - {item.variantName}</div>
              <div className="text-gray-400 text-xs">
                {item.quantity} &times; {formatCurrency(item.appliedPrice)}
                {item.wholesaleActive && <span className="text-amber-600 ml-1">(wholesale)</span>}
              </div>
            </div>
            <div className="font-medium ml-3">{formatCurrency(item.appliedPrice * item.quantity)}</div>
          </div>
        ))}
        <div className="flex justify-between items-center px-3 py-2.5 bg-gray-50 font-bold">
          <span>Total</span>
          <span className="text-green-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ConnectionBadge />
      <div className="flex gap-4 h-[calc(100vh-48px)]">
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm"
                />
              </div>
              {lastSync && (
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  Updated: {new Date(lastSync).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="bg-white rounded-xl p-4 shadow-sm border text-left hover:border-green-300 hover:shadow transition-all"
                >
                  <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                  <div className="text-xs text-gray-400">{product.variants.length} variant{product.variants.length > 1 ? "s" : ""}</div>
                  {product.variants.length === 1 && (
                    <div className="text-green-600 font-bold text-sm mt-1">{formatCurrency(product.variants[0].sellPrice)}</div>
                  )}
                  {product.category && <div className="text-xs text-gray-400 mt-1">{product.category}</div>}
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center text-gray-400 py-12">No products found</div>
            )}
          </div>
        </div>

        <div className="w-80 bg-white rounded-xl shadow-sm border flex flex-col">
          <div className="p-4 border-b flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            <span className="font-semibold">Cart ({itemCount})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">Cart is empty</div>
            ) : (
              cart.map((item) => (
                <div key={item.variantId} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <div className="font-medium line-clamp-1">{item.productName}</div>
                    <div className="text-gray-400 text-xs">
                      {item.variantName}
                      {item.wholesaleActive ? (
                        <span>
                          {" "}&times;{" "}
                          <span className="line-through text-gray-400">{formatCurrency(item.price)}</span>
                          {" "}
                          <span className="text-amber-600 font-medium">{formatCurrency(item.appliedPrice)}</span>
                        </span>
                      ) : (
                        <span> &times; {formatCurrency(item.price)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.variantId, -1)} className="p-0.5 rounded hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                    <span className={`w-6 text-center font-medium ${item.wholesaleActive ? "text-amber-600" : ""}`}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.variantId, 1)} className="p-0.5 rounded hover:bg-gray-100"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button onClick={() => removeItem(item.variantId)} className="p-0.5 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentType("cash")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border ${
                    paymentType === "cash" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => setPaymentType("gcash")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border ${
                    paymentType === "gcash" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  GCash
                </button>
                <button
                  onClick={() => setPaymentType("credit")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border ${
                    paymentType === "credit" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  Credit
                </button>
              </div>
              {paymentType === "credit" && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                      onFocus={() => setShowMemberDropdown(true)}
                      onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
                      placeholder="Search member..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    {showMemberDropdown && filteredMembers.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onMouseDown={() => selectMember(m)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700"
                          >
                            <div className="font-medium">{m.name}</div>
                            {m.phone && <div className="text-xs text-gray-400">{m.phone}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {memberId ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg text-sm">
                      <span className="text-green-700 font-medium">{customerName}</span>
                      <button
                        onClick={() => { setMemberId(null); setCustomerName(""); setCustomerPhone("+63 "); }}
                        className="text-xs text-red-500 hover:text-red-700 ml-auto"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name *"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <PhoneInput
                        value={customerPhone}
                        onChange={setCustomerPhone}
                      />
                    </>
                  )}
                </div>
              )}
              <button
                onClick={handleCheckoutClick}
                disabled={isPending || (paymentType === "credit" && (!customerName.trim() || customerPhone.length < 14))}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending && <Spinner />}
                {isPending
                  ? "Processing..."
                  : status === "offline"
                  ? `Queue - ${formatCurrency(total)}`
                  : paymentType === "gcash"
                  ? `Pay with GCash - ${formatCurrency(total)}`
                  : paymentType === "credit"
                  ? `Process Credit - ${formatCurrency(total)}`
                  : `Checkout - ${formatCurrency(total)}`}
              </button>
            </div>
          )}
        </div>

        <VariantPickerModal
          open={showVariantPicker && !!selected}
          onClose={() => {
            setShowVariantPicker(false);
            setSelectedProduct(null);
          }}
          product={
            selected
              ? { name: selected.name, variants: selected.variants }
              : { name: "", variants: [] }
          }
          onAddToCart={(variant, quantity) => {
            addToCart(
              { id: variant.id, name: variant.name, sellPrice: variant.sellPrice, wholesalePrice: variant.wholesalePrice, wholesaleThreshold: variant.wholesaleThreshold },
              selected!.name,
              quantity,
            );
          }}
        />

        <GcashQrModal
          open={showGcashQr}
          onClose={() => setShowGcashQr(false)}
          onConfirm={handleGcashConfirm}
          total={total}
        />

        <ConfirmModal
          open={showCheckoutConfirm}
          onClose={() => setShowCheckoutConfirm(false)}
          onConfirm={() => handleCheckout(false)}
          title={status === "offline" ? "Queue Offline Order" : "Confirm Checkout"}
          message={`Payment: ${paymentType.toUpperCase()}${paymentType === "credit" ? ` | Customer: ${customerName}` : ""}. ${status === "offline" ? "This will sync automatically when you're back online." : ""}`}
          confirmLabel={status === "offline" ? "Queue Sale" : paymentType === "credit" ? "Process Credit" : "Complete"}
          confirmSecondaryLabel={status === "offline" ? undefined : "Complete & Print"}
          onConfirmSecondary={status === "offline" ? undefined : () => handleCheckout(true)}
          loading={isPending}
        >
          {checkoutSummary}
        </ConfirmModal>

      </div>
    </>
  );
}
