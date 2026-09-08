import { FormField, Input, Input2 } from '@pluralsh/design-system'

export function PolicyNameField({
  value,
  onChange,
  required = true,
}: {
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <FormField
      label="Name"
      required={required}
    >
      <Input2
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}

export function PolicyDescriptionField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FormField label="Description">
      <Input
        minRows={2}
        multiline
        placeholder="Describe what this policy governs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}
