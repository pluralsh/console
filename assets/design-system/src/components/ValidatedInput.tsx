import { Input, type InputProps } from 'honorable'
import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useState,
} from 'react'

import FormField from './FormField'

export type ValidationResponse = { error: boolean; message: string } | null
export type CaptionProps = { caption: string; color: string }

export type ValidatedInputProps = InputProps &
  PropsWithChildren<{
    label?: ReactNode
    hint?: ReactNode
    validation?: (val: string) => ValidationResponse
  }>

function ValidatedInput({
  ref,
  label,
  hint,
  validation,
  onChange,
  width,
  ...input
}: ValidatedInputProps) {
  const [error, setError] = useState(null)
  const wrappedOnChange = useCallback(
    (e: any) => {
      if (onChange) onChange(e)
      setError(
        validation && e.target?.value ? validation(e.target.value) : undefined
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
      <Input
        onChange={wrappedOnChange}
        width="100%"
        {...input}
        error={error?.error}
        valid={error ? !error.error : null}
      />
    </FormField>
  )
}

export default ValidatedInput
