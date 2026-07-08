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
      expenseDeliveries: {
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
  const { name, type, amount, note, deliveryItems } = await req.json();

  const expense = await prisma.expense.create({
    data: {
      name: name || "",
      type,
      amount: parseFloat(amount) || 0,
      note: note || "",
      cashierId: userId,
    },
  });

  if (type === "delivery" && Array.isArray(deliveryItems) && deliveryItems.length > 0) {
    for (const item of deliveryItems) {
      const quantity = parseInt(String(item.quantity)) || 0;
      if (quantity <= 0) continue;

      let variantId = item.variantId || "";

      if (!variantId) {
        const productName = (item.productName || "").trim();
        const variantName = (item.variantName || "").trim();
        const costPrice = parseFloat(item.costPrice) || 0;
        const sellPrice = parseFloat(item.sellPrice) || 0;

        if (!productName || !variantName) continue;

        let product = await prisma.product.findFirst({
          where: { name: { equals: productName, mode: "insensitive" } },
        });

        if (!product) {
          product = await prisma.product.create({
            data: { name: productName, category: "" },
          });
        }

        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: variantName,
            sellPrice,
            costPrice,
            stock: quantity,
          },
        });

        variantId = variant.id;

        await prisma.stockLog.create({
          data: {
            variantId: variant.id,
            userId,
            changeAmount: quantity,
            reason: `Initial delivery: ${quantity} units`,
          },
        });
      } else {
        await prisma.productVariant.update({
          where: { id: variantId },
          data: { stock: { increment: quantity } },
        });

        await prisma.stockLog.create({
          data: {
            variantId,
            userId,
            changeAmount: quantity,
            reason: `Delivery: ${note || ""}`,
          },
        });
      }

      await prisma.expenseDelivery.create({
        data: {
          expenseId: expense.id,
          variantId,
          quantityDelivered: quantity,
        },
      });
    }
  }

  const result = await prisma.expense.findUnique({
    where: { id: expense.id },
    include: {
      expenseDeliveries: {
        include: { variant: { include: { product: { select: { name: true } } } } },
      },
      cashier: { select: { username: true } },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
