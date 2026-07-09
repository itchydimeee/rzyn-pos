import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const members = await prisma.member.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json();
  if (!name || !phone) return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });

  const member = await prisma.member.create({
    data: { name, phone },
  });

  return NextResponse.json(member);
}
