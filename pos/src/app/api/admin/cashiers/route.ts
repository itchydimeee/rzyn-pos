import { prisma } from "@/lib/prisma";
import { hashCode } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const cashiers = await prisma.user.findMany({
    where: { role: "cashier" },
    select: {
      id: true,
      username: true,
      stockPermission: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cashiers);
}

export async function POST(req: NextRequest) {
  const { username, code } = await req.json();
  if (!username || !code) {
    return NextResponse.json({ error: "Username and code are required" }, { status: 400 });
  }
  if (code.length !== 6 || !/^\d+$/.test(code)) {
    return NextResponse.json({ error: "Code must be exactly 6 digits" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  const hashedCode = await hashCode(code);
  const cashier = await prisma.user.create({
    data: { username, code: hashedCode, role: "cashier" },
    select: { id: true, username: true, stockPermission: true, isActive: true },
  });

  return NextResponse.json(cashier, { status: 201 });
}
