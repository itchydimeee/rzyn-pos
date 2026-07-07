import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { variants: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const { name, category, variants } = await req.json();
  const product = await prisma.product.create({
    data: {
      name,
      category: category || "",
      variants: {
        create: variants.map((v: { name: string; sellPrice: number; costPrice: number; stock: number; lowStockThreshold: number; barcode?: string; wholesalePrice?: number | null; wholesaleThreshold?: number | null }) => ({
          name: v.name,
          sellPrice: v.sellPrice,
          costPrice: v.costPrice,
          stock: v.stock || 0,
          lowStockThreshold: v.lowStockThreshold || 5,
          barcode: v.barcode || null,
          wholesalePrice: v.wholesalePrice ?? null,
          wholesaleThreshold: v.wholesaleThreshold ?? null,
        })),
      },
    },
    include: { variants: true },
  });
  return NextResponse.json(product, { status: 201 });
}
