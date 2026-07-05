import { prisma } from "@/lib/prisma";
import { compareCode, createToken, setAuthCookie } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, code, role } = await req.json();

  if (!username || !code || !role) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.role !== role) {
    return NextResponse.json({ error: "Invalid role for this user" }, { status: 401 });
  }

  const valid = await compareCode(code, user.code);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    stockPermission: user.stockPermission,
  });

  await setAuthCookie(token);

  return NextResponse.json({ success: true, role: user.role });
}
