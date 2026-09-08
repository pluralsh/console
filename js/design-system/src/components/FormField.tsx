import { type AriaLabelingProps, type DOMProps } from '@react-types/shared'
import { Div, type DivProps, Flex, Label, P } from 'honorable'
import { isNil } from 'lodash-es'
import {
  type LabelHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  createContext,
  useContext,
  useMemo,
} from 'react'

import { useLabel } from 'react-aria'
import IconFrame from './IconFrame'
import { InfoOutlineIcon } from '../icons'
import { useTheme } from 'styled-components'

type FormFieldProps = DivProps &
  PropsWithChildren<{
    label?: ReactNode
    labelProps?: Omit<LabelHTMLAttributes<HTMLLabelElement>, 'id'>
    labellingProps?: AriaLabelingProps
    layout?: 'vertical' | 'horizontal'
    caption?: ReactNode
    hint?: ReactNode
    infoTooltip?: ReactNode
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

function FormField({
  children,
  label,
  labelProps = {},
  labellingProps = {},
  layout = 'vertical',
  caption,
  hint,
  infoTooltip,
  error,
  length,
  maxLength,
  required,
  small,
  ...props
}: FormFieldProps) {
  const { spacing } = useTheme()
  const hasLabel = label || required || infoTooltip
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

  const topContent = hasTopContent && (
    <Flex align="center">
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
          {infoTooltip && (
            <IconFrame
              clickable
              icon={<InfoOutlineIcon color="text-light" />}
              size="xsmall"
              color="text-light"
              tooltip={infoTooltip}
              tooltipProps={{ style: { maxWidth: 450 } }}
              css={{ display: 'inline-flex', marginLeft: spacing.xxsmall }}
            />
          )}
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
  )

  const bottomContent = hasBottomContent && (
    <Flex
      align="flex-start"
      color="text-light"
      marginTop={layout === 'vertical' ? 'xsmall' : 'xxxsmall'}
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
  )

  const fieldContent = (
    <Div
      marginTop={layout === 'vertical' && hasTopContent ? 'xxsmall' : 0}
      marginBottom={layout === 'vertical' && hasBottomContent ? 'xxsmall' : 0}
    >
      {children}
    </Div>
  )

  const content =
    layout === 'horizontal' ? (
      <Flex
        align="flex-start"
        gap="medium"
        {...props}
      >
        <Div
          flex="1 1 0"
          minWidth={0}
        >
          {topContent}
          {bottomContent}
        </Div>
        <Div
          flex="1 1 0"
          minWidth={0}
        >
          {fieldContent}
        </Div>
      </Flex>
    ) : (
      <Div {...props}>
        {topContent && <Div marginBottom="xsmall">{topContent}</Div>}
        {fieldContent}
        {bottomContent}
      </Div>
    )

  return (
    <FormFieldContext.Provider value={contextVal}>
      {content}
    </FormFieldContext.Provider>
  )
}

export default FormField
