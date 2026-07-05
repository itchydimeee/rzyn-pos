import { prisma } from "@/lib/prisma";
import { hashCode } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.code) {
    const hashedCode = await hashCode(body.code);
    await prisma.user.update({ where: { id }, data: { code: hashedCode } });
    return NextResponse.json({ success: true, message: "Code reset" });
  }

  if (typeof body.stockPermission === "boolean") {
    await prisma.user.update({ where: { id }, data: { stockPermission: body.stockPermission } });
    return NextResponse.json({ success: true });
  }

  if (typeof body.isActive === "boolean") {
    await prisma.user.update({ where: { id }, data: { isActive: body.isActive } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No valid field" }, { status: 400 });
}
