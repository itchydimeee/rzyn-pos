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
    include: { items: true },
  });

  const totalSales = transactions.reduce((s, t) => s + t.total, 0);

  const allItems = transactions.flatMap((t) => t.items);
  const variantIds = [...new Set(allItems.map((i) => i.variantId))];
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, costPrice: true },
  });
  const costMap = new Map(variants.map((v) => [v.id, v.costPrice]));

  const totalProfit = allItems.reduce((sum, item) => {
    const cost = costMap.get(item.variantId) || 0;
    return sum + (item.priceAtSale - cost) * item.quantity;
  }, 0);

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
  });
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const expenseByType: Record<string, number> = {};
  for (const e of expenses) {
    expenseByType[e.type] = (expenseByType[e.type] || 0) + e.amount;
  }

  const cashSales = transactions.filter((t) => t.paymentType === "cash").reduce((s, t) => s + t.total, 0);
  const gcashSales = transactions.filter((t) => t.paymentType === "gcash").reduce((s, t) => s + t.total, 0);

  return NextResponse.json({
    filter,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalSales,
    totalProfit,
    totalExpenses,
    expenseByType,
    cashSales,
    gcashSales,
    transactionCount: transactions.length,
  });
}
