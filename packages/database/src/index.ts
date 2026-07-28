export * from "./client";

// seed.ts is NOT exported here on purpose — it has a top-level `main()`
// call that executes as soon as the module loads. Exporting it would mean
// anything that imports `@nx-inventory/database` anywhere in the monorepo
// (including apps/web booting in production) re-runs the seed script as a
// side effect. Run it standalone instead: `tsx src/seed.ts` or via your
// `db:seed` package script — never import it.

import type { Prisma as PrismaTypes } from "@prisma/client";
export {
  Prisma,
  MovementType,
  ReferenceType,
  TrackingMode,
  BusinessType,
  UserRole,
} from "@prisma/client";

export { Decimal } from "@prisma/client-runtime-utils";

/** Shared type for "must be called inside an existing Prisma transaction". */
export type TxClient = PrismaTypes.TransactionClient;
