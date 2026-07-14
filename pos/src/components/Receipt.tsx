"use client";

import { formatCurrency } from "@/lib/utils";

export interface ReceiptData {
  orNumber: string;
  createdAt: string;
  paymentType: "cash" | "gcash" | "credit";
  items: { productName: string; variantName: string; quantity: number; priceAtSale: number; lineTotal: number }[];
  total: number;
  amountTendered?: number | null;
  change?: number | null;
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
    <div style={{ width: "58mm", fontFamily: "monospace", fontSize: 9, lineHeight: 1.4, padding: "4px 6px", boxSizing: "border-box", background: "white" }}>
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 10, marginBottom: 2 }}>RZYN VARIETY STORE</div>
      <div style={{ textAlign: "center", fontSize: 8, marginBottom: 1 }}>Liningwan, Maabay,</div>
      <div style={{ textAlign: "center", fontSize: 8, marginBottom: 6 }}>Sibunag, Guimaras</div>

      <div style={{ fontSize: 8, marginBottom: 1 }}>OR#: {data.orNumber}</div>
      <div style={{ fontSize: 8, marginBottom: 1 }}>Date: {formatReceiptDate(data.createdAt)}</div>
      <div style={{ fontSize: 8, marginBottom: 4 }}>Type: {paymentLabel}</div>

      <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />

      {data.items.map((item, idx) => (
        <div key={idx} style={{ marginBottom: 3, fontSize: 8 }}>
          <div style={{ fontWeight: "bold", wordBreak: "break-word" }}>{item.productName} - {item.variantName}</div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 4 }}>
            <span>{item.quantity} &times; {formatCurrency(item.priceAtSale)}</span>
            <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>{formatCurrency(item.lineTotal)}</span>
          </div>
        </div>
      ))}

      <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 10, marginBottom: 4 }}>
        <span>TOTAL:</span>
        <span style={{ whiteSpace: "nowrap" }}>{formatCurrency(data.total)}</span>
      </div>

      {data.amountTendered != null && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 2 }}>
            <span>AMT TENDERED:</span>
            <span style={{ whiteSpace: "nowrap" }}>{formatCurrency(data.amountTendered)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 9, marginBottom: 4 }}>
            <span>CHANGE:</span>
            <span style={{ whiteSpace: "nowrap" }}>{formatCurrency(data.change ?? 0)}</span>
          </div>
        </>
      )}

      <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />

      {data.paymentType === "credit" && (
        <>
          <div style={{ fontSize: 8, marginBottom: 1 }}>Customer: {data.customerName}</div>
          {data.customerPhone && <div style={{ fontSize: 8, marginBottom: 1 }}>Phone: {data.customerPhone}</div>}
          <div style={{ fontSize: 8, marginTop: 8, marginBottom: 2 }}>Signature: _________________</div>
          <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />
        </>
      )}

      <div style={{ textAlign: "center", fontSize: 9, marginTop: 4 }}>Thank you!</div>

      {showControls && (
        <div className="no-print" style={{ textAlign: "center", marginTop: 12 }}>
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
