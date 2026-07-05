import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayTransactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: todayStart, lte: todayEnd },
    },
    include: { items: true },
  });

  const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);

  const todayTransactionIds = todayTransactions.map((t) => t.id);
  const allItems = todayTransactions.flatMap((t) => t.items);

  const variantIds = allItems.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, costPrice: true },
  });
  const costMap = new Map(variants.map((v) => [v.id, v.costPrice]));

  const todayProfit = allItems.reduce((sum, item) => {
    const cost = costMap.get(item.variantId) || 0;
    return sum + (item.priceAtSale - cost) * item.quantity;
  }, 0);

  const todayExpenses = await prisma.expense.findMany({
    where: { createdAt: { gte: todayStart, lte: todayEnd } },
  });
  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const weekTransactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { total: true, createdAt: true },
  });

  const salesChart: { date: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const total = weekTransactions
      .filter((t) => new Date(t.createdAt) >= dayStart && new Date(t.createdAt) <= dayEnd)
      .reduce((s, t) => s + t.total, 0);
    salesChart.push({ date: dateStr, total });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekItems = await prisma.transactionItem.findMany({
    where: {
      transaction: { createdAt: { gte: weekStart } },
    },
    include: {
      variant: { include: { product: true } },
    },
  });

  const topMap = new Map<string, { name: string; variantName: string; totalSold: number }>();
  for (const item of weekItems) {
    const key = item.variantId;
    const existing = topMap.get(key);
    if (existing) {
      existing.totalSold += item.quantity;
    } else {
      topMap.set(key, {
        name: item.variant.product.name,
        variantName: item.variant.name,
        totalSold: item.quantity,
      });
    }
  }
  const topProducts = Array.from(topMap.values())
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);

  const allVariants = await prisma.productVariant.findMany({
    where: { product: { isActive: true } },
    include: { product: true },
  });
  const lowStock = allVariants
    .filter((v) => v.stock <= v.lowStockThreshold)
    .map((v) => ({
      id: v.id,
      productName: v.product.name,
      variantName: v.name,
      stock: v.stock,
      threshold: v.lowStockThreshold,
    }));

  return NextResponse.json({
    todaySales,
    todayProfit,
    todayExpenses: todayExpenseTotal,
    salesChart,
    topProducts,
    lowStock,
  });
}
