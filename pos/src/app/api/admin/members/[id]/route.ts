import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await prisma.creditPayment.updateMany({
    where: { memberId: id },
    data: { memberId: null },
  });

  await prisma.member.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
