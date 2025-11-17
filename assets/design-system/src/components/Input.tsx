import { ExtendTheme, Input as HonorableInput, mergeTheme } from 'honorable'
import type {
  InputProps as HonorableInputProps,
  ThemeProviderProps,
} from 'honorable'
import { type ComponentProps, type FC, type ReactNode, useRef } from 'react'
import styled, { useTheme } from 'styled-components'
import { mergeRefs } from 'react-merge-refs'
import { mergeProps } from 'react-aria'

import { simulateInputChange } from '../utils/simulateInputChange'

import { type FillLevel, useFillLevel } from './contexts/FillLevelContext'
import { TitleContent } from './Select'
import Tooltip from './Tooltip'
import IconFrame from './IconFrame'
import CloseIcon from './icons/CloseIcon'

import { useFormField } from './FormField'

const TypedExtendTheme = ExtendTheme as FC<ThemeProviderProps>

export type InputProps = HonorableInputProps & {
  suffix?: ReactNode
  prefix?: ReactNode
  titleContent?: ReactNode
  showClearButton?: boolean
  themeExtension?: Record<string, any>
}

const PrefixSuffix = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  paddingLeft: theme.spacing.small,
  paddingRight: theme.spacing.small,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-three']
      : theme.colors['fill-two'],
}))

const startEndStyles = {
  alignSelf: 'stretch',
  display: 'flex',
  gap: 'small',
  marginRight: 0,
  marginLeft: 0,
  paddingRight: 0,
  paddingLeft: 0,
}

const parentFillLevelToBackground = {
  0: 'fill-one',
  1: 'fill-two',
  2: 'fill-three',
  3: 'fill-three',
} as const satisfies Record<FillLevel, string>

const ClearButton = styled(
  ({
    className,
    ...props
  }: Omit<ComponentProps<typeof IconFrame>, 'clickable' | 'icon' | 'size'>) => (
    <div className={className}>
      <Tooltip
        placement="top"
        label="Clear"
      >
        <IconFrame
          clickable
          icon={<CloseIcon />}
          size="small"
          {...props}
        />
      </Tooltip>
    </div>
  )
)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  paddingRight: theme.spacing.xsmall,
}))

const InputTitleContent = styled(TitleContent)((_) => ({
  alignSelf: 'stretch',
}))

function Input({
  ref,
  startIcon,
  endIcon,
  suffix,
  prefix,
  showClearButton,
  titleContent,
  inputProps,
  themeExtension: themeExtensionProp,
  ...props
}: InputProps) {
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)

  inputProps = {
    ...(inputProps ?? {}),
    ref: mergeRefs([inputRef, ...(inputProps?.ref ? [inputProps.ref] : [])]),
  }
  let themeExtension: any = {
    Input: {
      Root: [
        {
          paddingLeft: 0,
          paddingRight: 0,
        },
      ],
      InputBase: [
        {
          paddingLeft: prefix
            ? 'xsmall'
            : titleContent
              ? startIcon
                ? 'xsmall'
                : 'small'
              : 'medium',
          paddingRight: suffix
            ? 'xsmall'
            : showClearButton || endIcon
              ? 'xsmall'
              : 'medium',
        },
      ],
      StartIcon: [
        {
          ...startEndStyles,
          paddingLeft: prefix || titleContent ? 0 : 'medium',
          marginRight: 0,
        },
      ],
      EndIcon: [
        {
          ...startEndStyles,
          paddingRight: suffix || showClearButton ? 0 : 'medium',
          marginLeft: 0,
        },
      ],
    },
  }

  themeExtension = mergeTheme(themeExtension, themeExtensionProp)

  const parentFillLevel = useFillLevel()
  const size = (props as any).large
    ? 'large'
    : (props as any).small
      ? 'small'
      : 'medium'

  inputProps = mergeProps(useFormField()?.fieldProps ?? {}, inputProps)
  const hasEndIcon = (showClearButton && props.value) || endIcon || suffix
  const hasStartIcon = startIcon || prefix || titleContent

  return (
    <TypedExtendTheme theme={themeExtension}>
      <HonorableInput
        ref={ref}
        endIcon={
          hasEndIcon && (
            <>
              {showClearButton && props.value && (
                <ClearButton
                  onClick={() => {
                    const input = inputRef?.current

                    if (input) {
                      simulateInputChange(input, '')
                    }
                  }}
                />
              )}
              {endIcon || suffix ? (
                <>
                  {endIcon}
                  {suffix && <PrefixSuffix>{suffix}</PrefixSuffix>}
                </>
              ) : undefined}
            </>
          )
        }
        startIcon={
          hasStartIcon ? (
            <>
              {(titleContent && (
                <InputTitleContent
                  $size={size}
                  $parentFillLevel={parentFillLevel}
                >
                  {titleContent}
                </InputTitleContent>
              )) ||
                (prefix && <PrefixSuffix>{prefix}</PrefixSuffix>)}
              {startIcon}
            </>
          ) : undefined
        }
        backgroundColor={
          theme.colors[parentFillLevelToBackground[parentFillLevel]]
        }
        inputProps={inputProps}
        {...props}
      />
    </TypedExtendTheme>
  )
}

export default Input
