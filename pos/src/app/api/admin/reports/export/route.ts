import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "daily";
  const date = searchParams.get("date") || "";

  let startDate: Date;
  let endDate: Date = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (filter === "daily") {
    startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
  } else if (filter === "weekly") {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
  }

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
  });

  let csv = "Type,Details,Quantity,Amount,Date\n";

  for (const t of transactions) {
    for (const item of t.items) {
      csv += `"Sale","${item.variant.product.name} - ${item.variant.name}",${item.quantity},${item.priceAtSale * item.quantity},"${new Date(t.createdAt).toLocaleString("en-PH")}"\n`;
    }
  }

  for (const e of expenses) {
    csv += `"Expense","${e.type}${e.note ? " - " + e.note : ""}","",${e.amount},"${new Date(e.createdAt).toLocaleString("en-PH")}"\n`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="pos-report-${filter}.csv"`,
    },
  });
}
