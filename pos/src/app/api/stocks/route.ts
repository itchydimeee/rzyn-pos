import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const variants = await prisma.productVariant.findMany({
    where: { product: { isActive: true } },
    include: { product: { select: { name: true, category: true } } },
    orderBy: { product: { name: "asc" } },
  });

  const stockLogs = await prisma.stockLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { username: true } },
      variant: { include: { product: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ variants, stockLogs });
}

export async function PUT(req: NextRequest) {
  const { variantId, changeAmount, reason } = await req.json();
  const userId = req.headers.get("x-user-id") || "";

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { stock: variant.stock + changeAmount },
  });

  await prisma.stockLog.create({
    data: { variantId, userId, changeAmount, reason: reason || "" },
  });

  return NextResponse.json({ success: true });
}
