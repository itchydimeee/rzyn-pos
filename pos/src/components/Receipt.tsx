"use client";

import { formatCurrency } from "@/lib/utils";

export interface ReceiptData {
  orNumber: string;
  createdAt: string;
  paymentType: "cash" | "gcash" | "credit";
  items: { productName: string; variantName: string; quantity: number; priceAtSale: number; lineTotal: number }[];
  total: number;
  customerName?: string;
  customerPhone?: string;
}

function formatReceiptDate(iso: string): string {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const d = new Date(iso);
  const month = months[d.getMonth()];
  const day = d.getDate().toString().padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
}

export function Receipt({ data, showControls }: { data: ReceiptData; showControls?: boolean }) {
  const paymentLabel = data.paymentType === "cash" ? "CASH" : data.paymentType === "gcash" ? "GCASH" : "CREDIT";

  return (
    <div className="receipt-print-area bg-white" style={{ maxWidth: 300, margin: "0 auto", fontFamily: "monospace", fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: 4 }}>RZYN VARIETY STORE</div>
      <div style={{ textAlign: "center", fontSize: 10, marginBottom: 2 }}>Liningwan, Maabay,</div>
      <div style={{ textAlign: "center", fontSize: 10, marginBottom: 8 }}>Sibunag, Guimaras</div>

      <div style={{ marginBottom: 2 }}>OR#: {data.orNumber}</div>
      <div style={{ marginBottom: 2 }}>Date: {formatReceiptDate(data.createdAt)}</div>
      <div style={{ marginBottom: 8 }}>Type: {paymentLabel}</div>

      <div style={{ borderTop: "1px dashed #999", marginBottom: 4 }} />

      {data.items.map((item, idx) => (
        <div key={idx} style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: "bold" }}>{item.productName} - {item.variantName}</div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 8 }}>
            <span>{item.quantity} &times; {formatCurrency(item.priceAtSale)}</span>
            <span style={{ fontWeight: "bold" }}>{formatCurrency(item.lineTotal)}</span>
          </div>
        </div>
      ))}

      <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 13 }}>
        <span>TOTAL:</span>
        <span>{formatCurrency(data.total)}</span>
      </div>
      <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />

      {data.paymentType === "credit" && (
        <>
          <div style={{ marginBottom: 2 }}>Customer: {data.customerName}</div>
          {data.customerPhone && <div style={{ marginBottom: 2 }}>Phone: {data.customerPhone}</div>}
          <div style={{ marginTop: 12, marginBottom: 4 }}>Signature: _________________</div>
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 8 }}>Thank you!</div>

      {showControls && (
        <div className="no-print" style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "8px 24px",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Print Receipt
          </button>
        </div>
      )}
    </div>
  );
}
