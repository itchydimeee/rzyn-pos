import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const creditPayment = await prisma.creditPayment.findUnique({
    where: { id },
    include: { transaction: { include: { items: true } } },
  });

  if (!creditPayment) {
    return NextResponse.json({ error: "Credit payment not found" }, { status: 404 });
  }

  await prisma.creditPayment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

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
      member: { select: { id: true, name: true, phone: true } },
      transaction: true,
      resolvedBy: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    transactionId: updated.transactionId,
    customerName: updated.customerName,
    customerPhone: updated.customerPhone,
    member: updated.member ? { id: updated.member.id, name: updated.member.name, phone: updated.member.phone } : null,
    amount: updated.transaction.total,
    status: updated.status,
    resolvedAt: updated.resolvedAt?.toISOString() || null,
    resolvedBy: updated.resolvedBy?.username || null,
  });
}
