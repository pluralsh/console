import React, { PropsWithChildren, ReactNode, Ref, forwardRef, useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import { Input, InputProps, Span } from 'honorable'

import FormField from './FormField'

export type ValidationResponse = {error: boolean, message: string} | null
export type CaptionProps = {caption: string, color: string}

export type ValidatedInputProps = InputProps & PropsWithChildren<{
  label?: ReactNode
  hint?: ReactNode
  caption?: (props: CaptionProps) => React.ReactElement
  validation?: (val: string) => ValidationResponse
}>

const propTypes = {
  label: PropTypes.node,
  hint: PropTypes.node,
  caption: PropTypes.func,
  validation: PropTypes.func,
}

function defaultCaption({ caption, color }: CaptionProps) : React.ReactElement {
  return (
    <Span color={color}>{caption}</Span>
  )
}

function ValidatedInputRef({ label, hint, validation, onChange, width, caption, ...input } : ValidatedInputProps, ref: Ref<any>) {
  const [error, setError] = useState(null)
  const wrappedOnChange = useCallback((e: any) => {
    if (e.target?.value && validation) setError(validation(e.target.value))
    if (onChange) onChange(e)
  }, [onChange, validation])

  const captionComp = caption || defaultCaption
    
  return (
    <FormField
      ref={ref}
      label={label}
      hint={hint}
      caption={error ? React.createElement(captionComp, { caption: error.message, color: error.error ? 'text-error' : 'text-success' }) : null}
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
