import { FormField, Input } from '@pluralsh/design-system'

import { ComponentPropsWithoutRef, ReactNode, RefObject } from 'react'

export function LabelledInput({
  ref,
  label,
  value,
  onChange,
  placeholder,
  type,
  caption,
  hint,
  error = undefined,
  required = false,
  disabled = false,
  inputProps,
  ...props
}: {
  ref?: RefObject<HTMLInputElement>
  label?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  type?: string
  caption?: ReactNode
  hint?: string
  error?: boolean
  required?: boolean
  disabled?: boolean
  inputProps?: ComponentPropsWithoutRef<typeof Input>
} & ComponentPropsWithoutRef<typeof FormField>) {
  return (
    <FormField
      label={label}
      caption={caption}
      hint={hint}
      marginBottom="small"
      error={error}
      required={required}
      {...props}
    >
      <Input
        ref={ref}
        width="100%"
        name={label}
        type={type}
        value={value || ''}
        onChange={onChange && (({ target: { value } }) => onChange(value))}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        {...inputProps}
      />
    </FormField>
  )
}
