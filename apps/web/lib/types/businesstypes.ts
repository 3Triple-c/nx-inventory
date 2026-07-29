import type { BusinessTypeOption } from "@/lib/types/types";


export const BUSINESS_TYPES: BusinessTypeOption[] = [
  {
    value: "GENERIC",
    label: "General",
    description: "Suitable for most businesses.",
  },
  {
    value: "PHARMACY",
    label: "Pharmacy",
    description: "Manage medicines, prescriptions, batches, and expiry dates.",
  },
  {
    value: "SUPERMARKET",
    label: "Supermarket",
    description: "Manage groceries, household goods, and retail inventory.",
  },
  {
    value: "RESTAURANT",
    label: "Restaurant",
    description: "Track ingredients, menu items, and kitchen inventory.",
  },
  {
    value: "WAREHOUSE",
    label: "Warehouse",
    description: "Manage stock storage, transfers, and distribution.",
  },
  {
    value: "POULTRY",
    label: "Poultry",
    description: "Track birds, feed, eggs, and farm inventory.",
  },
  {
    value: "MANUFACTURING",
    label: "Manufacturing",
    description: "Manage raw materials, production, and finished goods.",
  },
];