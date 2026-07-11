import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: {
            include: { product: true },
          },
        },
      },
      creditPayment: true,
    },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const receiptItems = transaction.items.map((ti) => ({
    productName: ti.variant.product.name,
    variantName: ti.variant.name,
    quantity: ti.quantity,
    priceAtSale: ti.priceAtSale,
    lineTotal: ti.priceAtSale * ti.quantity,
  }));

  return NextResponse.json({
    transactionId: transaction.id,
    orNumber: transaction.orNumber,
    total: transaction.total,
    createdAt: transaction.createdAt.toISOString(),
    paymentType: transaction.paymentType,
    items: receiptItems,
    customerName: transaction.creditPayment?.customerName || undefined,
    customerPhone: transaction.creditPayment?.customerPhone || undefined,
  });
}
