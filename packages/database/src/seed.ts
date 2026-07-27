// import {
//   MovementType,
//   TrackingMode,
//   BusinessType,
//   UserRole,
// } from "@prisma/client";
// import { applyStockMovement } from "@nx-inventory/inventory";
// import { prisma } from "./client";

// /**
//  * Idempotent demo seed: fixed ids so re-running this doesn't create
//  * duplicates — every upsert keys off one of these.
//  *
//  * Deliberately gives you: two BATCH-tracked variants (one healthy, one
//  * with a batch expiring in 20 days so you have real data for the
//  * expiry-dashboard work in Phase 2/4) and two NONE-tracked variants (one
//  * healthy, one already below its reorder level so you have real data for
//  * the low-stock list from day one).
//  */
// const BUSINESS_ID = "seed-business-demo-pharmacy";
// const WAREHOUSE_ID = "seed-warehouse-main-store";
// const OWNER_ID = "seed-user-owner";
// const SUPPLIER_ID = "seed-supplier-medsupply";
// const CUSTOMER_ID = "seed-customer-walkin";

// async function main() {
//   console.log("Seeding demo data...");

//   const owner = await prisma.user.upsert({
//     where: { id: OWNER_ID },
//     update: {},
//     create: {
//       id: OWNER_ID,
//       firstName: "Ada",
//       lastName: "Owner",
//       email: "owner@demo-pharmacy.test",
//       // Placeholder only. Swap for a real bcrypt/argon2 hash once Phase 1's
//       // auth package exists — never let a plaintext value like this reach
//       // anything beyond a local dev database.
//       password: "seed-placeholder-not-a-real-hash",
//     },
//   });

//   const business = await prisma.business.upsert({
//     where: { id: BUSINESS_ID },
//     update: {},
//     create: {
//       id: BUSINESS_ID,
//       name: "Demo Pharmacy",
//       type: BusinessType.PHARMACY,
//     },
//   });

//   await prisma.membership.upsert({
//     where: { userId_businessId: { userId: owner.id, businessId: business.id } },
//     update: {},
//     create: { userId: owner.id, businessId: business.id, role: UserRole.OWNER },
//   });

//   const warehouse = await prisma.warehouse.upsert({
//     where: { id: WAREHOUSE_ID },
//     update: {},
//     create: {
//       id: WAREHOUSE_ID,
//       businessId: business.id,
//       name: "Main Store",
//       address: "12 Aba Road, Port Harcourt",
//     },
//   });

//   const supplier = await prisma.supplier.upsert({
//     where: { id: SUPPLIER_ID },
//     update: {},
//     create: {
//       id: SUPPLIER_ID,
//       businessId: business.id,
//       name: "MedSupply Ltd",
//       phone: "+234-800-000-0000",
//     },
//   });

//   await prisma.customer.upsert({
//     where: { id: CUSTOMER_ID },
//     update: {},
//     create: {
//       id: CUSTOMER_ID,
//       businessId: business.id,
//       name: "Walk-in Customer",
//     },
//   });

//   const tabletUnit = await prisma.unit.upsert({
//     where: { businessId_symbol: { businessId: business.id, symbol: "tab" } },
//     update: {},
//     create: { businessId: business.id, name: "Tablet", symbol: "tab" },
//   });

//   const pieceUnit = await prisma.unit.upsert({
//     where: { businessId_symbol: { businessId: business.id, symbol: "pc" } },
//     update: {},
//     create: { businessId: business.id, name: "Piece", symbol: "pc" },
//   });

//   const medicines = await prisma.category.upsert({
//     where: { id: "seed-category-medicines" },
//     update: {},
//     create: {
//       id: "seed-category-medicines",
//       businessId: business.id,
//       name: "Medicines",
//     },
//   });

//   const consumables = await prisma.category.upsert({
//     where: { id: "seed-category-consumables" },
//     update: {},
//     create: {
//       id: "seed-category-consumables",
//       businessId: business.id,
//       name: "Consumables",
//     },
//   });

//   // --- Products: 2 BATCH-tracked, 2 NONE-tracked ------------------------
//   const paracetamol = await prisma.product.upsert({
//     where: { id: "seed-product-paracetamol" },
//     update: {},
//     create: {
//       id: "seed-product-paracetamol",
//       businessId: business.id,
//       categoryId: medicines.id,
//       name: "Paracetamol 500mg",
//       unit: "tablet",
//     },
//   });
//   const paracetamolVariant = await prisma.productVariant.upsert({
//     where: { id: "seed-variant-paracetamol" },
//     update: {},
//     create: {
//       id: "seed-variant-paracetamol",
//       productId: paracetamol.id,
//       unitId: tabletUnit.id,
//       name: "Paracetamol 500mg Tablet",
//       sku: "PARA-500-TAB",
//       price: 20,
//       costPrice: 12,
//       trackingMode: TrackingMode.BATCH,
//     },
//   });

//   const amoxicillin = await prisma.product.upsert({
//     where: { id: "seed-product-amoxicillin" },
//     update: {},
//     create: {
//       id: "seed-product-amoxicillin",
//       businessId: business.id,
//       categoryId: medicines.id,
//       name: "Amoxicillin 250mg",
//       unit: "capsule",
//     },
//   });
//   const amoxicillinVariant = await prisma.productVariant.upsert({
//     where: { id: "seed-variant-amoxicillin" },
//     update: {},
//     create: {
//       id: "seed-variant-amoxicillin",
//       productId: amoxicillin.id,
//       unitId: tabletUnit.id,
//       name: "Amoxicillin 250mg Capsule",
//       sku: "AMOX-250-CAP",
//       price: 35,
//       costPrice: 22,
//       trackingMode: TrackingMode.BATCH,
//     },
//   });

//   const cottonWool = await prisma.product.upsert({
//     where: { id: "seed-product-cotton-wool" },
//     update: {},
//     create: {
//       id: "seed-product-cotton-wool",
//       businessId: business.id,
//       categoryId: consumables.id,
//       name: "Cotton Wool Roll",
//       unit: "piece",
//     },
//   });
//   const cottonWoolVariant = await prisma.productVariant.upsert({
//     where: { id: "seed-variant-cotton-wool" },
//     update: {},
//     create: {
//       id: "seed-variant-cotton-wool",
//       productId: cottonWool.id,
//       unitId: pieceUnit.id,
//       name: "Cotton Wool Roll 500g",
//       sku: "CTW-500",
//       price: 500,
//       costPrice: 300,
//       trackingMode: TrackingMode.NONE,
//     },
//   });

//   const syringe = await prisma.product.upsert({
//     where: { id: "seed-product-syringe" },
//     update: {},
//     create: {
//       id: "seed-product-syringe",
//       businessId: business.id,
//       categoryId: consumables.id,
//       name: "Disposable Syringe 5ml",
//       unit: "piece",
//     },
//   });
//   const syringeVariant = await prisma.productVariant.upsert({
//     where: { id: "seed-variant-syringe" },
//     update: {},
//     create: {
//       id: "seed-variant-syringe",
//       productId: syringe.id,
//       unitId: pieceUnit.id,
//       name: "Disposable Syringe 5ml",
//       sku: "SYR-5ML",
//       price: 50,
//       costPrice: 30,
//       trackingMode: TrackingMode.NONE,
//     },
//   });

//   // --- Opening stock, through applyStockMovement — same function real
//   // purchases/sales will use, so seeding also doubles as a smoke test of it.
//   const now = Date.now();
//   const oneYearOut = new Date(now + 365 * 24 * 60 * 60 * 1000);
//   const twentyDaysOut = new Date(now + 20 * 24 * 60 * 60 * 1000);

//   await prisma.$transaction(async (tx) => {
//     const paracetamolBatch = await tx.productBatch.upsert({
//       where: {
//         warehouseId_variantId_batchNumber: {
//           warehouseId: warehouse.id,
//           variantId: paracetamolVariant.id,
//           batchNumber: "PARA-BATCH-001",
//         },
//       },
//       update: {},
//       create: {
//         variantId: paracetamolVariant.id,
//         warehouseId: warehouse.id,
//         batchNumber: "PARA-BATCH-001",
//         expiryDate: oneYearOut,
//         unitCost: 12,
//         quantity: 0,
//       },
//     });
//     await applyStockMovement({
//       tx,
//       businessId: business.id,
//       warehouseId: warehouse.id,
//       variantId: paracetamolVariant.id,
//       quantity: 500,
//       type: MovementType.OPENING_STOCK,
//       batchId: paracetamolBatch.id,
//       performedById: owner.id,
//       note: "Seed data — healthy stock, batch expires in 1 year",
//     });

//     const amoxicillinBatch = await tx.productBatch.upsert({
//       where: {
//         warehouseId_variantId_batchNumber: {
//           warehouseId: warehouse.id,
//           variantId: amoxicillinVariant.id,
//           batchNumber: "AMOX-BATCH-001",
//         },
//       },
//       update: {},
//       create: {
//         variantId: amoxicillinVariant.id,
//         warehouseId: warehouse.id,
//         batchNumber: "AMOX-BATCH-001",
//         expiryDate: twentyDaysOut,
//         unitCost: 22,
//         quantity: 0,
//       },
//     });
//     await applyStockMovement({
//       tx,
//       businessId: business.id,
//       warehouseId: warehouse.id,
//       variantId: amoxicillinVariant.id,
//       quantity: 15,
//       type: MovementType.OPENING_STOCK,
//       batchId: amoxicillinBatch.id,
//       performedById: owner.id,
//       note: "Seed data — deliberately low, batch expires in 20 days",
//     });

//     await applyStockMovement({
//       tx,
//       businessId: business.id,
//       warehouseId: warehouse.id,
//       variantId: cottonWoolVariant.id,
//       quantity: 80,
//       type: MovementType.OPENING_STOCK,
//       performedById: owner.id,
//       note: "Seed data — healthy stock, not batch-tracked",
//     });

//     await applyStockMovement({
//       tx,
//       businessId: business.id,
//       warehouseId: warehouse.id,
//       variantId: syringeVariant.id,
//       quantity: 8,
//       type: MovementType.OPENING_STOCK,
//       performedById: owner.id,
//       note: "Seed data — deliberately low, not batch-tracked",
//     });
//   });

//   // Reorder levels are set after stock exists (Stock rows are get-or-created
//   // inside applyStockMovement, so they don't exist until the call above runs).
//   await prisma.stock.update({
//     where: {
//       warehouseId_variantId: {
//         warehouseId: warehouse.id,
//         variantId: paracetamolVariant.id,
//       },
//     },
//     data: { reorderLevel: 100, reorderQuantity: 300 },
//   });
//   await prisma.stock.update({
//     where: {
//       warehouseId_variantId: {
//         warehouseId: warehouse.id,
//         variantId: amoxicillinVariant.id,
//       },
//     },
//     data: { reorderLevel: 20, reorderQuantity: 100 },
//   });
//   await prisma.stock.update({
//     where: {
//       warehouseId_variantId: {
//         warehouseId: warehouse.id,
//         variantId: cottonWoolVariant.id,
//       },
//     },
//     data: { reorderLevel: 20, reorderQuantity: 100 },
//   });
//   await prisma.stock.update({
//     where: {
//       warehouseId_variantId: {
//         warehouseId: warehouse.id,
//         variantId: syringeVariant.id,
//       },
//     },
//     data: { reorderLevel: 10, reorderQuantity: 50 },
//   });

//   console.log("Seed complete:");
//   console.log(`  Business:     ${business.name} (${business.id})`);
//   console.log(`  Owner login:  ${owner.email}`);
//   console.log(`  Warehouse:    ${warehouse.name}`);
//   console.log(`  Supplier:     ${supplier.name}`);
//   console.log(
//     "  4 variants — Paracetamol & Amoxicillin (BATCH), Cotton Wool & Syringe (NONE)",
//   );
//   console.log(
//     "  Amoxicillin batch expires in 20 days; syringes are already below reorder level.",
//   );
// }

// main()
//   .catch((err) => {
//     console.error("Seed failed:", err);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
