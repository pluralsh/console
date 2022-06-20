import { PropsWithChildren, ReactNode, Ref, forwardRef, useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import { Input, InputProps } from 'honorable'

import FormField from './FormField'

export type ValidationResponse = {error: boolean, message: string} | null

export type ValidatedInputProps = InputProps & PropsWithChildren<{
  label?: ReactNode
  hint?: ReactNode
  validation?: (val: string) => ValidationResponse
}>

const propTypes = {
  label: PropTypes.node,
  hint: PropTypes.node,
  validation: PropTypes.func,
}

function ValidatedInputRef({ label, hint, validation, onChange, width, ...input } : ValidatedInputProps, ref: Ref<any>) {
  const [error, setError] = useState(null)
  const wrappedOnChange = useCallback((e: any) => {
    if (e.target?.value && validation) setError(validation(e.target.value))
    if (onChange) onChange(e)
  }, [onChange, validation])
    
  return (
    <FormField
      ref={ref}
      label={label}
      hint={hint}
      caption={error?.message}
      width={width}
    >
      <Input
        onChange={wrappedOnChange}
        width={width}
        {...input}
        error={error?.error}
        valid={error ? !error.error : null}
      />
    </FormField>
  )
}

const ValidatedInput = forwardRef(ValidatedInputRef)

ValidatedInput.propTypes = propTypes

export default ValidatedInput
