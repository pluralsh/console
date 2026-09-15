import { type AriaLabelingProps, type DOMProps } from '@react-types/shared'
import Flex from './Flex'
import { isNil } from 'lodash-es'
import {
  type ComponentPropsWithRef,
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
import styled, { useTheme } from 'styled-components'

type FormFieldProps = ComponentPropsWithRef<'div'> &
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
  const theme = useTheme()
  const { spacing } = theme
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
        <LabelSC
          $small={small}
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
        </LabelSC>
      )}
      {caption && <CaptionSC $small={small}>{caption}</CaptionSC>}
    </Flex>
  )

  const bottomContent = hasBottomContent && (
    <Flex
      align="flex-start"
      css={{
        color: theme.colors['text-light'],
        marginTop: layout === 'vertical' ? spacing.xsmall : spacing.xxxsmall,
      }}
    >
      {typeof hint === 'string' ? <HintSC $error={error}>{hint}</HintSC> : hint}
      {typeof maxLength === 'number' && (
        <LengthSC $hasHint={!!hint}>
          {length} / {maxLength}
        </LengthSC>
      )}
    </Flex>
  )

  const fieldContent = (
    <div
      css={{
        marginTop: layout === 'vertical' && hasTopContent ? spacing.xxsmall : 0,
        marginBottom:
          layout === 'vertical' && hasBottomContent ? spacing.xxsmall : 0,
      }}
    >
      {children}
    </div>
  )

  const content =
    layout === 'horizontal' ? (
      <Flex
        align="flex-start"
        gap="medium"
        {...props}
      >
        <div css={{ flex: '1 1 0', minWidth: 0 }}>
          {topContent}
          {bottomContent}
        </div>
        <div css={{ flex: '1 1 0', minWidth: 0 }}>{fieldContent}</div>
      </Flex>
    ) : (
      <div {...props}>
        {topContent && (
          <div css={{ marginBottom: spacing.xsmall }}>{topContent}</div>
        )}
        {fieldContent}
        {bottomContent}
      </div>
    )

  return (
    <FormFieldContext.Provider value={contextVal}>
      {content}
    </FormFieldContext.Provider>
  )
}

const LabelSC = styled.label<{ $small?: boolean }>(({ theme, $small }) => ({
  margin: 0,
  ...($small ? theme.partials.text.caption : theme.partials.text.body2),
  fontWeight: 600,
  flexShrink: 0,
  flexGrow: 1,
}))

const CaptionSC = styled.p<{ $small?: boolean }>(({ theme, $small }) => ({
  margin: 0,
  marginLeft: theme.spacing.medium,
  ...($small ? theme.partials.text.caption : theme.partials.text.body2),
  ...theme.partials.text.truncate,
  flexShrink: 1,
  color: theme.colors['text-light'],
}))

const HintSC = styled.p<{ $error?: boolean }>(({ theme, $error }) => ({
  margin: 0,
  flexGrow: 1,
  ...theme.partials.text.caption,
  color: $error ? theme.colors['text-danger'] : theme.colors['text-xlight'],
}))

const LengthSC = styled.p<{ $hasHint?: boolean }>(({ theme, $hasHint }) => ({
  margin: 0,
  marginLeft: $hasHint ? theme.spacing.medium : 0,
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
  textAlign: 'right',
  flexGrow: 1,
}))

export default FormField
