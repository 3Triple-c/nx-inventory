export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type BusinessType = {
  value:
    | "GENERIC"
    | "PHARMACY"
    | "SUPERMARKET"
    | "RESTAURANT"
    | "WAREHOUSE"
    | "POULTRY"
    | "MANUFACTURING";
  label: string;
  description?: string;
};

export type BusinessField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

// export type OrganisationType = {
//   value: string;
//   label: string;
//   fields: BusinessField[];
// };

export type FieldSelectProps = {
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  options: SelectOption[];
};