import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function FieldInput() {
  return (
    <FieldSet className="w-full max-w-xs">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="username">Business name</FieldLabel>
          <Input name="name" type="text" placeholder="Max LTD" required />
          <FieldDescription>
            Choose a unique username for your business
          </FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  )
}
