import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "";
  const { items, paymentType } = await req.json();

  if (!items || !items.length) {
    return NextResponse.json({ error: "No items" }, { status: 400 });
  }

  let total = 0;
  const transactionItems: { variantId: string; quantity: number; priceAtSale: number }[] = [];

  for (const item of items) {
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (!variant) return NextResponse.json({ error: `Variant ${item.variantId} not found` }, { status: 400 });
    if (variant.stock < item.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${variant.name}` }, { status: 400 });
    }
    const lineTotal = variant.sellPrice * item.quantity;
    total += lineTotal;
    transactionItems.push({ variantId: variant.id, quantity: item.quantity, priceAtSale: variant.sellPrice });
  }

  const transaction = await prisma.transaction.create({
    data: {
      cashierId: userId,
      total,
      paymentType,
      items: { create: transactionItems },
    },
  });

  for (const item of items) {
    await prisma.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  return NextResponse.json({ success: true, transactionId: transaction.id, total });
}
