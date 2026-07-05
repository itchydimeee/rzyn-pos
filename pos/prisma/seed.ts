import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminCode = await bcrypt.hash("112312", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", code: adminCode, role: "admin", stockPermission: true },
  });
  console.log("Seeded admin user:", admin.username);

  const cashierCode = await bcrypt.hash("654321", 10);
  const cashier = await prisma.user.upsert({
    where: { username: "cashier1" },
    update: {},
    create: { username: "cashier1", code: cashierCode, role: "cashier", stockPermission: true },
  });
  console.log("Seeded cashier:", cashier.username);

  const products = [
    { name: "Sardinas", category: "Canned Goods", variants: [
      { name: "155g", sellPrice: 25, costPrice: 20, stock: 100, lowStockThreshold: 10 },
      { name: "425g", sellPrice: 55, costPrice: 45, stock: 50, lowStockThreshold: 5 },
    ]},
    { name: "Corned Beef", category: "Canned Goods", variants: [
      { name: "150g", sellPrice: 35, costPrice: 28, stock: 80, lowStockThreshold: 10 },
      { name: "380g", sellPrice: 75, costPrice: 60, stock: 40, lowStockThreshold: 5 },
    ]},
    { name: "Rice", category: "Grains", variants: [
      { name: "1kg", sellPrice: 55, costPrice: 48, stock: 200, lowStockThreshold: 20 },
      { name: "5kg", sellPrice: 260, costPrice: 230, stock: 60, lowStockThreshold: 10 },
      { name: "10kg", sellPrice: 500, costPrice: 440, stock: 30, lowStockThreshold: 5 },
    ]},
    { name: "Cooking Oil", category: "Condiments", variants: [
      { name: "500ml", sellPrice: 45, costPrice: 38, stock: 70, lowStockThreshold: 10 },
      { name: "1L", sellPrice: 85, costPrice: 72, stock: 50, lowStockThreshold: 5 },
    ]},
    { name: "Instant Noodles", category: "Noodles", variants: [
      { name: "Regular", sellPrice: 10, costPrice: 7, stock: 200, lowStockThreshold: 30 },
      { name: "Jumbo", sellPrice: 18, costPrice: 14, stock: 150, lowStockThreshold: 20 },
    ]},
    { name: "Coffee 3-in-1", category: "Beverages", variants: [
      { name: "Single", sellPrice: 8, costPrice: 6, stock: 300, lowStockThreshold: 50 },
      { name: "Pack of 10", sellPrice: 75, costPrice: 60, stock: 40, lowStockThreshold: 5 },
    ]},
    { name: "Powdered Milk", category: "Beverages", variants: [
      { name: "33g", sellPrice: 8, costPrice: 6, stock: 200, lowStockThreshold: 30 },
      { name: "300g", sellPrice: 95, costPrice: 78, stock: 35, lowStockThreshold: 5 },
    ]},
    { name: "Shampoo", category: "Personal Care", variants: [
      { name: "12ml Sachet", sellPrice: 8, costPrice: 5, stock: 250, lowStockThreshold: 30 },
      { name: "200ml", sellPrice: 85, costPrice: 68, stock: 30, lowStockThreshold: 5 },
    ]},
    { name: "Laundry Detergent", category: "Household", variants: [
      { name: "70g Bar", sellPrice: 15, costPrice: 11, stock: 180, lowStockThreshold: 20 },
      { name: "1kg Powder", sellPrice: 120, costPrice: 95, stock: 40, lowStockThreshold: 5 },
    ]},
    { name: "Canned Tuna", category: "Canned Goods", variants: [
      { name: "155g", sellPrice: 28, costPrice: 22, stock: 90, lowStockThreshold: 10 },
      { name: "425g", sellPrice: 60, costPrice: 48, stock: 45, lowStockThreshold: 5 },
    ]},
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { id: "seed-" + p.name.toLowerCase().replace(/\s+/g, "-") },
      update: { name: p.name, category: p.category },
      create: { id: "seed-" + p.name.toLowerCase().replace(/\s+/g, "-"), name: p.name, category: p.category },
    });
    for (const v of p.variants) {
      await prisma.productVariant.create({ data: { productId: product.id, ...v } });
    }
    console.log(`  Seeded: ${p.name} (${p.variants.length} variants)`);
  }

  console.log("\nSeed complete!");
  console.log("Admin login: admin / 112312");
  console.log("Cashier login: cashier1 / 654321");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
