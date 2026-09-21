import { FormField, Input } from '@pluralsh/design-system'

import { ComponentPropsWithoutRef, ReactNode, RefObject } from 'react'
import { useTheme } from 'styled-components'

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
  ref?: RefObject<HTMLInputElement | null>
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
} & Omit<ComponentPropsWithoutRef<typeof FormField>, 'onChange'>) {
  const theme = useTheme()

  return (
    <FormField
      label={label}
      caption={caption}
      hint={hint}
      style={{ marginBottom: theme.spacing.small }}
      error={error}
      required={required}
      {...props}
    >
      <Input
        width="100%"
        value={value || ''}
        onChange={onChange && (({ target: { value } }) => onChange(value))}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        {...inputProps}
        inputProps={{
          name: label,
          type,
          ref,
          ...inputProps?.inputProps,
        }}
      />
    </FormField>
  )
}
