import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, category, variants } = await req.json();

  const product = await prisma.product.update({
    where: { id },
    data: {
      name,
      category: category || "",
    },
  });

  const existingVariantIds = variants.filter((v: { id?: string }) => v.id).map((v: { id: string }) => v.id);
  await prisma.productVariant.deleteMany({
    where: { productId: id, id: { notIn: existingVariantIds } },
  });

  for (const v of variants) {
    if (v.id) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: {
          name: v.name,
          sellPrice: v.sellPrice,
          costPrice: v.costPrice,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold || 5,
          barcode: v.barcode || null,
        },
      });
    } else {
      await prisma.productVariant.create({
        data: {
          productId: id,
          name: v.name,
          sellPrice: v.sellPrice,
          costPrice: v.costPrice,
          stock: v.stock || 0,
          lowStockThreshold: v.lowStockThreshold || 5,
          barcode: v.barcode || null,
        },
      });
    }
  }

  const updated = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
