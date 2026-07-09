import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status === "pending" || status === "resolved") {
    where.status = status;
  }

  const creditPayments = await prisma.creditPayment.findMany({
    where,
    include: {
      transaction: true,
      member: { select: { id: true, name: true, phone: true } },
      resolvedBy: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();

  const result = creditPayments.map((cp) => {
    const createdAt = new Date(cp.createdAt).getTime();
    const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);
    const weeksOverdue = Math.max(0, Math.floor((daysSinceCreation - 7) / 7));
    const interestMultiplier = Math.pow(1.03, weeksOverdue);
    const amount = cp.transaction.total;
    const interest = amount * interestMultiplier - amount;
    const totalDue = amount * interestMultiplier;

    return {
      id: cp.id,
      transactionId: cp.transactionId,
      customerName: cp.customerName,
      customerPhone: cp.customerPhone,
      member: cp.member ? { id: cp.member.id, name: cp.member.name, phone: cp.member.phone } : null,
      amount,
      status: cp.status,
      daysSinceCreation: Math.round(daysSinceCreation),
      weeksOverdue,
      interest: Math.round(interest * 100) / 100,
      totalDue: Math.round(totalDue * 100) / 100,
      resolvedAt: cp.resolvedAt?.toISOString() || null,
      resolvedBy: cp.resolvedBy ? cp.resolvedBy.username : null,
      createdAt: cp.createdAt.toISOString(),
    };
  });

  return NextResponse.json(result);
}
