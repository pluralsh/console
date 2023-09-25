import { ExtendTheme, Input as HonorableInput, mergeTheme } from 'honorable'
import type { InputProps as HonorableInputProps } from 'honorable'
import { type ComponentProps, type ReactNode, forwardRef, useRef } from 'react'
import styled from 'styled-components'
import { mergeRefs } from 'react-merge-refs'

import { mergeProps } from 'react-aria'

import { simulateInputChange } from '../utils/simulateInputChange'

import { useFillLevel } from './contexts/FillLevelContext'
import { TitleContent } from './Select'
import Tooltip from './Tooltip'
import IconFrame from './IconFrame'
import CloseIcon from './icons/CloseIcon'

import { useFormField } from './FormField'

export type InputProps = HonorableInputProps & {
  suffix?: ReactNode
  prefix?: ReactNode
  titleContent?: ReactNode
  showClearButton?: boolean
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

const Input = forwardRef(
  (
    {
      startIcon,
      endIcon,
      suffix,
      prefix,
      showClearButton,
      titleContent,
      inputProps,
      ...props
    }: InputProps,
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null)

    inputProps = {
      ...(inputProps ?? {}),
      ref: mergeRefs([inputRef, ...(inputProps?.ref ? [inputProps.ref] : [])]),
    }
    let themeExtension: any = {}
    const parentFillLevel = useFillLevel()
    const size = (props as any).large
      ? 'large'
      : (props as any).small
      ? 'small'
      : 'medium'

    if (suffix || showClearButton) {
      themeExtension = mergeTheme(themeExtension, {
        Input: {
          Root: [{ paddingRight: 0 }],
          EndIcon: [
            { ...startEndStyles, ...{ paddingLeft: 'xsmall', gap: 0 } },
          ],
        },
      })
    }
    if (prefix || titleContent) {
      themeExtension = mergeTheme(themeExtension, {
        Input: {
          Root: [{ paddingLeft: 0 }],
          StartIcon: [
            {
              ...startEndStyles,
              ...{
                paddingRight: titleContent && !startIcon ? 'small' : 'xsmall',
              },
            },
          ],
        },
      })
    }
    inputProps = mergeProps(useFormField()?.fieldProps ?? {}, inputProps)

    return (
      <ExtendTheme theme={themeExtension}>
        <HonorableInput
          ref={ref}
          endIcon={
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
          }
          startIcon={
            startIcon || prefix || titleContent ? (
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
          inputProps={inputProps}
          {...props}
        />
      </ExtendTheme>
    )
  }
)

export default Input
