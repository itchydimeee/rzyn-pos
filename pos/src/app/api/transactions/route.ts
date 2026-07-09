import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "";
  const { items, paymentType, customerName, customerPhone, memberId } = await req.json();

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
    const price = variant.wholesalePrice != null && variant.wholesaleThreshold != null && item.quantity >= variant.wholesaleThreshold
      ? variant.wholesalePrice
      : variant.sellPrice;
    const lineTotal = price * item.quantity;
    total += lineTotal;
    transactionItems.push({ variantId: variant.id, quantity: item.quantity, priceAtSale: price });
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

  let creditPaymentId: string | undefined;
  if (paymentType === "credit" && customerName && customerPhone) {
    const creditPayment = await prisma.creditPayment.create({
      data: {
        transactionId: transaction.id,
        customerName,
        customerPhone,
        memberId: memberId || null,
      },
    });
    creditPaymentId = creditPayment.id;
  }

  return NextResponse.json({ success: true, transactionId: transaction.id, total, creditPaymentId });
}
