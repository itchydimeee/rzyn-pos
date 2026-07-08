import { NextResponse } from "next/server";

const CSV_HEADER =
  "product_name,category,variant_name,sell_price,cost_price,stock,low_stock_threshold,barcode,wholesale_price,wholesale_threshold";

const SAMPLE_ROWS = [
  `"Sample Coffee","Beverages","Hot 12oz",55.00,30.00,100,10,4801234567890,45.00,50`,
  `"Sample Coffee","Beverages","Iced 16oz",65.00,35.00,80,5,4801234567891,55.00,40`,
];

export async function GET() {
  const csv = "\uFEFF" + CSV_HEADER + "\n" + SAMPLE_ROWS.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="product-upload-template.csv"`,
    },
  });
}
