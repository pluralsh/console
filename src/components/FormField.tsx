import { type AriaLabelingProps, type DOMProps } from '@react-types/shared'
import { Div, type DivProps, Flex, Label, P } from 'honorable'
import PropTypes from 'prop-types'
import {
  type LabelHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
  createContext,
  forwardRef,
  useContext,
  useMemo,
} from 'react'
import { isNil } from 'lodash-es'

import { useLabel } from 'react-aria'

type FormFieldProps = DivProps &
  PropsWithChildren<{
    label?: ReactNode
    labelProps?: Omit<LabelHTMLAttributes<HTMLLabelElement>, 'id'>
    labellingProps?: AriaLabelingProps
    caption?: ReactNode
    hint?: ReactNode
    length?: number
    maxLength?: number
    required?: boolean
    small?: boolean
    error?: boolean
  }>

type FormFieldContextT =
  | ({
      fieldProps?: AriaLabelingProps & DOMProps
    } & Partial<
      Pick<FormFieldProps, 'label' | 'caption' | 'hint' | 'maxLength'>
    >)
  | null

const FormFieldContext = createContext<FormFieldContextT>(null)

export function useFormField() {
  const context = useContext(FormFieldContext)

  return context
}

const propTypes = {
  label: PropTypes.node,
  caption: PropTypes.node,
  hint: PropTypes.node,
  length: PropTypes.number,
  maxLength: PropTypes.number,
  required: PropTypes.bool,
  small: PropTypes.bool,
}

function FormFieldRef(
  {
    children,
    label,
    labelProps = {},
    labellingProps = {},
    caption,
    hint,
    error,
    length,
    maxLength,
    required,
    small,
    ...props
  }: FormFieldProps,
  ref: Ref<any>
) {
  const hasLabel = label || required
  const hasTopContent = hasLabel || caption
  const hasBottomContent = !isNil(hint) || typeof maxLength === 'number'
  const useLabelProps = useLabel({
    label,
    ...(labelProps.htmlFor ? { id: labelProps.htmlFor } : {}),
    ...labellingProps,
  })

  labelProps = { ...labelProps, ...useLabelProps.labelProps }
  const contextVal = useMemo(
    () => ({
      fieldProps: useLabelProps.fieldProps,
      label,
      caption,
      hint,
      error,
      maxLength,
    }),
    [caption, error, hint, label, maxLength, useLabelProps.fieldProps]
  )

  const content = (
    <Div
      ref={ref}
      {...props}
    >
      {hasTopContent && (
        <Flex
          align="center"
          marginBottom="xsmall"
        >
          {hasLabel && (
            <Label
              caption={small}
              body2={!small}
              fontWeight="600"
              flexShrink={0}
              flexGrow={1}
              margin={0}
              {...labelProps}
            >
              {label}
              {required ? '*' : ''}
            </Label>
          )}
          {caption && (
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
          )}
        </Flex>
      )}
      <Div
        marginTop={hasTopContent ? 'xxsmall' : 0}
        marginBottom={hasBottomContent ? 'xxsmall' : 0}
      >
        {children}
      </Div>
      {hasBottomContent && (
        <Flex
          align="flex-start"
          color="text-light"
          marginTop="xsmall"
        >
          {typeof hint === 'string' ? (
            <P
              flexGrow={1}
              caption
              color={error ? 'text-danger' : 'text-xlight'}
            >
              {hint}
            </P>
          ) : (
            hint
          )}
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
      )}
    </Div>
  )

  return (
    <FormFieldContext.Provider value={contextVal}>
      {content}
    </FormFieldContext.Provider>
  )
}

const FormField = forwardRef(FormFieldRef)

FormField.propTypes = propTypes

export default FormField
