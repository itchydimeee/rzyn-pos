import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function generateOrNumber(): string {
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "";
  const { items, paymentType, amountTendered, customerName, customerPhone, memberId } = await req.json();

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

  let change: number | undefined;
  if (amountTendered != null) {
    if (amountTendered < total) {
      return NextResponse.json({ error: "Amount tendered is less than the total" }, { status: 400 });
    }
    change = Math.round((amountTendered - total) * 100) / 100;
  }

  let orNumber: string;
  for (let attempt = 0; attempt < 5; attempt++) {
    orNumber = generateOrNumber();
    const existing = await prisma.transaction.findUnique({ where: { orNumber } });
    if (!existing) break;
    if (attempt === 4) {
      return NextResponse.json({ error: "Failed to generate unique OR number" }, { status: 500 });
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      orNumber: orNumber!,
      cashierId: userId,
      total,
      amountTendered: amountTendered ?? null,
      change: change ?? null,
      paymentType,
      items: { create: transactionItems },
    },
    include: {
      items: {
        include: {
          variant: {
            include: { product: true },
          },
        },
      },
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

  const receiptItems = transaction.items.map((ti) => ({
    productName: ti.variant.product.name,
    variantName: ti.variant.name,
    quantity: ti.quantity,
    priceAtSale: ti.priceAtSale,
    lineTotal: ti.priceAtSale * ti.quantity,
  }));

  return NextResponse.json({
    success: true,
    transactionId: transaction.id,
    orNumber: transaction.orNumber,
    total: transaction.total,
    amountTendered: transaction.amountTendered,
    change: transaction.change,
    createdAt: transaction.createdAt.toISOString(),
    paymentType: transaction.paymentType,
    items: receiptItems,
    customerName: customerName || undefined,
    customerPhone: customerPhone || undefined,
    creditPaymentId,
  });
}
