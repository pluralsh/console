import {
  PropsWithChildren,
  ReactNode,
  Ref,
  forwardRef,
  useCallback,
  useState,
} from 'react'
import PropTypes from 'prop-types'
import { Input, InputProps } from 'honorable'

import FormField from './FormField'

export type ValidationResponse = {error: boolean, message: string} | null
export type CaptionProps = {caption: string, color: string}

export type ValidatedInputProps = InputProps & PropsWithChildren<{
  label?: ReactNode
  hint?: ReactNode
  validation?: (val: string) => ValidationResponse
}>

const propTypes = {
  label: PropTypes.node,
  hint: PropTypes.node,
  caption: PropTypes.func,
  validation: PropTypes.func,
}

function ValidatedInputRef({
  label, hint, validation, onChange, width, ...input
} : ValidatedInputProps, ref: Ref<any>) {
  const [error, setError] = useState(null)
  const wrappedOnChange = useCallback((e: any) => {
    if (onChange) onChange(e)
    setError((validation && e.target?.value) ? validation(e.target.value) : undefined)
  }, [onChange, validation])

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

const ValidatedInput = forwardRef(ValidatedInputRef)

ValidatedInput.propTypes = propTypes

export default ValidatedInput
