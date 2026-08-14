import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {BUSINESS_TYPES} from "@/lib/types/businesstypes"
export function FieldSelect() {
  return (
     <Field className="w-full max-w-xs">
      <FieldLabel>Business type</FieldLabel>

      <Select name="type" defaultValue="GENERIC">
        <SelectTrigger>
          <SelectValue placeholder="Choose your business type" />
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            {BUSINESS_TYPES.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <FieldDescription>
        Select the type of business you&apos;re setting up.
      </FieldDescription>
    </Field>
  )
}
