import type { ReceiptData } from "@/components/Receipt";

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatPrintDate(iso: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(iso);
  const month = months[d.getMonth()];
  const day = d.getDate().toString().padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year} ${hours}:${minutes}${ampm}`;
}

export function printReceipt(data: ReceiptData): void {
  const paymentLabel = data.paymentType === "cash" ? "CASH" : data.paymentType === "gcash" ? "GCASH" : "CREDIT";

  // 58mm @ 96dpi = 219px. Content area with safety margins.
  const RECEIPT_W = 205;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: 58mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; }
  .receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: ${RECEIPT_W}px;
    padding: 6px 8px 6px 8px;
    font-family: "Courier New", monospace;
    font-size: 9px;
    line-height: 1.35;
    color: #000;
    background: white;
  }
  .center   { text-align: center; padding-right: 14px; }
  .hdr      { text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 1px; padding-right: 14px; }
  .sub      { text-align: center; font-size: 8px; padding-right: 14px; }
  hr        { border: none; border-top: 1px dashed #999; margin: 3px 0; }
  .info     { font-size: 8px; margin-bottom: 1px; }
  .mt       { margin-top: 4px; }

  .item-name { font-weight: bold; font-size: 8.5px; }

  /* price row: qty on left, amount pinned to right using fixed positions */
  .prow    { position: relative; height: 11px; width: 100%; }
  .prow-q  { position: absolute; left: 10px; top: 0; font-size: 8px; }
  .prow-a  { position: absolute; right: 16px; top: 0; font-size: 8px; font-weight: bold; }

  .trow    { position: relative; height: 12px; font-weight: bold; font-size: 9.5px; width: 100%; }
  .trow-l  { position: absolute; left: 0; top: 0; }
  .trow-v  { position: absolute; right: 16px; top: 0; }
</style>
</head>
<body>
<div class="receipt">
  <div class="hdr">RZYN VARIETY STORE</div>
  <div class="sub">Liningwan, Maabay,</div>
  <div class="sub" style="margin-bottom:2px">Sibunag, Guimaras</div>
  <hr>

  <div class="info">OR#: ${esc(data.orNumber)}</div>
  <div class="info">Date: ${formatPrintDate(data.createdAt)}</div>
  <div class="info">Type: ${paymentLabel}</div>
  <hr>

${data.items.map(item => {
  const name = esc(item.productName + " - " + item.variantName);
  const qtyPrice = esc(`${item.quantity} x \u20B1${item.priceAtSale.toFixed(2)}`);
  const lineTotal = `\u20B1${item.lineTotal.toFixed(2)}`;
  return `  <div class="item-name">${name}</div>
  <div class="prow"><span class="prow-q">${qtyPrice}</span><span class="prow-a">${lineTotal}</span></div>`;
}).join("\n")}

  <hr>
  <div class="trow"><span class="trow-l">TOTAL:</span><span class="trow-v">\u20B1${data.total.toFixed(2)}</span></div>
${data.amountTendered != null ? `
  <div class="prow"><span class="prow-q">AMT TENDERED:</span><span class="prow-a">\u20B1${data.amountTendered.toFixed(2)}</span></div>
  <div class="trow"><span class="trow-l">CHANGE:</span><span class="trow-v">\u20B1${(data.change ?? 0).toFixed(2)}</span></div>
` : ""}
  <hr>
${data.paymentType === "credit" ? `
  <div class="info">Customer: ${esc(data.customerName || "")}</div>
  ${data.customerPhone ? `<div class="info">Phone: ${esc(data.customerPhone)}</div>` : ""}
  <div class="info mt">Signature: _________________</div>
  <hr>
` : ""}
  <div class="center mt">Thank you!</div>
</div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = `${RECEIPT_W}px`;
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.style.height = `${doc.body.scrollHeight}px`;

  iframe.contentWindow!.focus();

  const cleanup = () => {
    document.body.removeChild(iframe);
  };

  const afterPrint = () => {
    window.removeEventListener("afterprint", afterPrint);
    cleanup();
  };

  window.addEventListener("afterprint", afterPrint);

  setTimeout(() => {
    if (document.body.contains(iframe)) cleanup();
  }, 60000);

  iframe.contentWindow!.print();
}
