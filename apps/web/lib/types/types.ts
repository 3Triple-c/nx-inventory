import type { BusinessType as PrismaBusinessType } from '@nx-inventory/database'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

/**
 * A display option for a Prisma BusinessType value — NOT the schema type
 * itself (that's PrismaBusinessType, imported above). Named "...Option"
 * deliberately: anything that wraps a schema enum/type with UI-only fields
 * (label, description, icon, etc.) should carry a suffix like Option,
 * ViewModel, or DTO so it can never collide with the real schema name, and
 * so its `value` field can be typed directly off the schema — see below —
 * instead of retyped by hand, which is what caused this in the first place.
 */
export type BusinessTypeOption = {
  value: PrismaBusinessType
  label: string
  description?: string
}

export type BusinessField = {
  key: string
  label: string
  placeholder?: string
  required?: boolean
}

export type FieldSelectProps = {
  name: string
  label: string
  placeholder?: string
  description?: string
  options: SelectOption[]
}