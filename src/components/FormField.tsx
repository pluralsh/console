import {
  Div, DivProps, Flex, P,
} from 'honorable'
import PropTypes from 'prop-types'
import {
  HTMLAttributes, PropsWithChildren, ReactNode, Ref, forwardRef,
} from 'react'

type FormFieldProps = DivProps & PropsWithChildren<{
  label?: ReactNode
  labelProps?: HTMLAttributes<HTMLElement>
  caption?: ReactNode
  hint?: ReactNode
  length?: number,
  maxLength?: number,
  required?: boolean,
  small?: boolean,
}>

const propTypes = {
  label: PropTypes.node,
  caption: PropTypes.node,
  hint: PropTypes.node,
  length: PropTypes.number,
  maxLength: PropTypes.number,
  required: PropTypes.bool,
  small: PropTypes.bool,
}

function FormFieldRef({
  children,
  label,
  labelProps,
  caption,
  hint,
  error,
  length,
  maxLength,
  required,
  small,
  ...props
}: FormFieldProps,
ref: Ref<any>) {
  return (
    <Div
      ref={ref}
      {...props}
    >
      <Flex
        align="center"
        marginBottom="xsmall"
      >
        <P
          caption={small}
          body2={!small}
          fontWeight="bold"
          flexShrink={0}
          {...labelProps}
        >
          {label}{required ? '*' : ''}
        </P>
        <Div flexGrow={1} />
        <P
          caption={small}
          body2={!small}
          marginLeft="medium"
          truncate
          flexShrink={1}
          color="text-light"
        >
          {caption}
        </P>
      </Flex>
      <Div
        marginTop={label || caption ? 'xxsmall' : 0}
        marginBottom={hint || maxLength ? 'xxsmall' : 0}
      >
        {children}
      </Div>
      <Flex
        align="top"
        color="text-light"
        marginTop="xsmall"
      >
        {typeof hint === 'string' ? (
          <P
            flexGrow={1}
            caption
            color={error ? 'text-error' : 'text-xlight'}
          >
            {hint}
          </P>
        ) : hint}
        {typeof maxLength === 'number' && (
          <P
            caption
            color="text-xlight"
            marginLeft={hint ? 'medium' : 0}
            whiteSpace="nowrap"
            textAlign="right"
            flexGrow={1}
          >
            {length} / {maxLength}
          </P>
        )}
      </Flex>
    </Div>
  )
}

const FormField = forwardRef(FormFieldRef)

FormField.propTypes = propTypes

export default FormField
