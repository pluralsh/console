import { PropsWithChildren, ReactNode, Ref, forwardRef, useEffect, useRef, useState } from 'react'
import { Div, DivProps, Flex, P } from 'honorable'
import PropTypes from 'prop-types'

type FormFieldProps = DivProps & PropsWithChildren<{
  label?: ReactNode
  caption?: ReactNode
  hint?: ReactNode
  valid?: boolean
  error?: boolean
  required?: boolean
}>

const propTypes = {
  label: PropTypes.node,
  caption: PropTypes.node,
  hint: PropTypes.node,
  valid: PropTypes.bool,
  error: PropTypes.bool,
  required: PropTypes.bool,
}

function FormFieldRef({
  children,
  label,
  caption,
  hint,
  valid,
  error,
  required,
  ...props
}: FormFieldProps,
ref: Ref<any>
) {
  return (
    <Div
      ref={ref}
      width={256}
      {...props}
    >
      <Flex align="center">
        <P
          fontWeight="bold"
          flexShrink={0}
        >
          {label}{required ? '*' : ''}
        </P>
        <Div flexGrow={1} />
        <P
          ml={0.5}
          caption
          truncate
          flexShrink={1}
          color="text-light"
        >
          {caption}
        </P>
      </Flex>
      <Div
        mt={label || caption ? 0.5 : 0}
        mb={hint ? 0.5 : 0}
      >
        {children}
      </Div>
      {hint}
    </Div>
  )
}

const FormField = forwardRef(FormFieldRef)

FormField.propTypes = propTypes

export default FormField
