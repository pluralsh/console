import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useState,
} from 'react'

import FormField from './FormField'
import Input2, { type InputPropsFull } from './Input2'

export type ValidationResponse = { error: boolean; message: string } | null
export type CaptionProps = { caption: string; color: string }

export type ValidatedInputProps = Omit<InputPropsFull, 'error' | 'ref'> &
  PropsWithChildren<{
    label?: ReactNode
    hint?: ReactNode
    validation?: (val: string) => ValidationResponse
    width?: string | number
    type?: ComponentPropsWithoutRef<'input'>['type']
    ref?: ComponentPropsWithoutRef<typeof FormField>['ref']
  }>

function ValidatedInput({
  ref,
  label,
  hint,
  validation,
  onChange,
  width,
  type,
  inputProps,
  ...input
}: ValidatedInputProps) {
  const [error, setError] = useState<ValidationResponse>(null)
  const wrappedOnChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      setError(
        validation && e.target?.value ? validation(e.target.value) : null
      )
    },
    [onChange, validation]
  )

  return (
    <FormField
      ref={ref}
      label={label}
      hint={error?.error ? error.message : hint}
      error={!!error?.error}
      width={width}
    >
      <Input2
        onChange={wrappedOnChange}
        css={{ width: '100%' }}
        inputProps={{ type, ...inputProps }}
        {...input}
        error={!!error?.error}
      />
    </FormField>
  )
}

export default ValidatedInput
