import { PropsWithChildren, ReactNode, Ref, forwardRef } from 'react'
import { Div, DivProps, Flex, P } from 'honorable'
import PropTypes from 'prop-types'

type FormFieldProps = DivProps & PropsWithChildren<{
  label?: ReactNode
  caption?: ReactNode
  hint?: ReactNode
  required?: boolean
}>

const propTypes = {
  label: PropTypes.node,
  caption: PropTypes.node,
  hint: PropTypes.node,
  required: PropTypes.bool,
}

function FormFieldRef({
  children,
  label,
  caption,
  hint,
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
          marginLeft="xsmall"
          caption
          truncate
          flexShrink={1}
          color="text-light"
        >
          {caption}
        </P>
      </Flex>
      <Div
        marginTop={label || caption ? 'xsmall' : 0}
        marginBottom={hint ? 'xsmall' : 0}
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
