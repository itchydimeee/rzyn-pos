import { prisma } from "@/lib/prisma";
import { compareCode, createToken, setAuthCookie } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_CODE_HASH = process.env.ADMIN_CODE_HASH;

export async function POST(req: NextRequest) {
  const { username, code, role } = await req.json();

  if (!username || !code || !role) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (role === "admin") {
    if (!ADMIN_USERNAME || !ADMIN_CODE_HASH) {
      return NextResponse.json({ error: "Admin credentials not configured" }, { status: 500 });
    }

    if (username !== ADMIN_USERNAME) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await compareCode(code, ADMIN_CODE_HASH);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let admin = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          username: ADMIN_USERNAME,
          code: ADMIN_CODE_HASH,
          role: "admin",
          stockPermission: true,
        },
      });
    }

    const token = await createToken({
      userId: admin.id,
      username: admin.username,
      role: admin.role,
      stockPermission: admin.stockPermission,
    });

    await setAuthCookie(token);
    return NextResponse.json({ success: true, role: "admin" });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.role !== role) {
    return NextResponse.json({ error: "Invalid role for this user" }, { status: 401 });
  }

  if (user.code !== code) {
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
