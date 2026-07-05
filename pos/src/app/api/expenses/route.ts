import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: todayStart, lte: todayEnd } },
    include: {
      expenseDelivery: {
        include: { variant: { include: { product: { select: { name: true } } } } },
      },
      cashier: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "";
  const { type, amount, note, deliveryVariantId, deliveryQuantity } = await req.json();

  let expenseData: Record<string, unknown> = {
    type,
    amount: parseFloat(amount) || 0,
    note: note || "",
    cashierId: userId,
  };

  const expense = await prisma.expense.create({ data: expenseData as never });

  if (type === "delivery" && deliveryVariantId && deliveryQuantity > 0) {
    await prisma.expenseDelivery.create({
      data: {
        expenseId: expense.id,
        variantId: deliveryVariantId,
        quantityDelivered: deliveryQuantity,
      },
    });
    await prisma.productVariant.update({
      where: { id: deliveryVariantId },
      data: { stock: { increment: deliveryQuantity } },
    });
    await prisma.stockLog.create({
      data: {
        variantId: deliveryVariantId,
        userId,
        changeAmount: deliveryQuantity,
        reason: `Delivery: ${note || ""}`,
      },
    });
  }

  return NextResponse.json(expense, { status: 201 });
}
