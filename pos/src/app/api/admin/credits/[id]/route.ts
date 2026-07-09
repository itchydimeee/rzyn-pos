import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.headers.get("x-user-id") || "";

  const creditPayment = await prisma.creditPayment.findUnique({
    where: { id },
  });

  if (!creditPayment) {
    return NextResponse.json({ error: "Credit payment not found" }, { status: 404 });
  }

  if (creditPayment.status === "resolved") {
    return NextResponse.json({ error: "Credit payment already resolved" }, { status: 400 });
  }

  const updated = await prisma.creditPayment.update({
    where: { id },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      resolvedById: userId,
    },
    include: {
      customer: true,
      transaction: true,
      resolvedBy: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    transactionId: updated.transactionId,
    customer: { id: updated.customer.id, name: updated.customer.name, phone: updated.customer.phone },
    amount: updated.transaction.total,
    status: updated.status,
    resolvedAt: updated.resolvedAt?.toISOString() || null,
    resolvedBy: updated.resolvedBy?.username || null,
  });
}
