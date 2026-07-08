import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

interface CsvRow {
  product_name?: string;
  category?: string;
  variant_name?: string;
  sell_price?: string | number;
  cost_price?: string | number;
  stock?: string | number;
  low_stock_threshold?: string | number;
  barcode?: string;
  wholesale_price?: string | number;
  wholesale_threshold?: string | number;
}

interface VariantData {
  name: string;
  sellPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  barcode: string | null;
  wholesalePrice: number | null;
  wholesaleThreshold: number | null;
}

interface ProductGroup {
  name: string;
  category: string;
  variants: VariantData[];
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rows: CsvRow[];
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json<CsvRow>(sheet, { defval: "" });
  } catch {
    return NextResponse.json({ error: "Failed to parse CSV file" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV file has no data rows" }, { status: 400 });
  }

  const groups = new Map<string, ProductGroup>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const productName = (row.product_name ?? "").toString().trim();
    if (!productName) {
      return NextResponse.json({ error: `Missing product_name at row ${rowNum}` }, { status: 400 });
    }

    const variantName = (row.variant_name ?? "").toString().trim();
    if (!variantName) {
      return NextResponse.json({ error: `Missing variant_name at row ${rowNum}` }, { status: 400 });
    }

    const sellPrice = parseFloat(String(row.sell_price ?? ""));
    if (isNaN(sellPrice) || sellPrice < 0) {
      return NextResponse.json({ error: `Invalid sell_price at row ${rowNum}` }, { status: 400 });
    }

    const costPrice = parseFloat(String(row.cost_price ?? ""));
    if (isNaN(costPrice) || costPrice < 0) {
      return NextResponse.json({ error: `Invalid cost_price at row ${rowNum}` }, { status: 400 });
    }

    const stockRaw = parseFloat(String(row.stock ?? "")) || 0;
    const stock = isNaN(stockRaw) ? 0 : Math.max(0, Math.floor(stockRaw));

    const thresholdRaw = parseFloat(String(row.low_stock_threshold ?? "")) || 5;
    const lowStockThreshold = isNaN(thresholdRaw) ? 5 : Math.max(0, Math.floor(thresholdRaw));

    const barcode = (row.barcode ?? "").toString().trim() || null;

    const wpRaw = row.wholesale_price !== undefined && row.wholesale_price !== "" ? parseFloat(String(row.wholesale_price)) : NaN;
    const wholesalePrice = isNaN(wpRaw) ? null : wpRaw;

    const wtRaw = row.wholesale_threshold !== undefined && row.wholesale_threshold !== "" ? parseFloat(String(row.wholesale_threshold)) : NaN;
    const wholesaleThreshold = isNaN(wtRaw) ? null : Math.max(0, Math.floor(wtRaw));

    const category = (row.category ?? "").toString().trim();
    const groupKey = `${productName}|||${category}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { name: productName, category, variants: [] });
    }

    groups.get(groupKey)!.variants.push({
      name: variantName,
      sellPrice,
      costPrice,
      stock,
      lowStockThreshold,
      barcode,
      wholesalePrice,
      wholesaleThreshold,
    });
  }

  let variantsCount = 0;

  try {
    await prisma.$transaction(
      Array.from(groups.values()).map((group) => {
        variantsCount += group.variants.length;
        return prisma.product.create({
          data: {
            name: group.name,
            category: group.category,
            variants: {
              create: group.variants.map((v) => ({
                name: v.name,
                sellPrice: v.sellPrice,
                costPrice: v.costPrice,
                stock: v.stock,
                lowStockThreshold: v.lowStockThreshold,
                barcode: v.barcode,
                wholesalePrice: v.wholesalePrice,
                wholesaleThreshold: v.wholesaleThreshold,
              })),
            },
          },
        });
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(
    { created: true, productsCount: groups.size, variantsCount },
    { status: 201 },
  );
}
