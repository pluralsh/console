import { ExtendTheme, Input as HonorableInput, mergeTheme } from 'honorable'
import type { InputProps as HonorableInputProps } from 'honorable'
import { type ReactNode, forwardRef } from 'react'
import styled from 'styled-components'

import { useFillLevel } from './contexts/FillLevelContext'
import { TitleContent } from './Select'

export type InputProps = HonorableInputProps & {
  suffix?: ReactNode
  prefix?: ReactNode
  titleContent?: ReactNode
}

const PrefixSuffix = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  paddingLeft: theme.spacing.small,
  paddingRight: theme.spacing.small,
  backgroundColor: theme.colors['fill-two'],
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

const InputTitleContent = styled(TitleContent)((_) => ({
  alignSelf: 'stretch',
}))

const Input = forwardRef(
  (
    { startIcon, endIcon, suffix, prefix, titleContent, ...props }: InputProps,
    ref
  ) => {
    let themeExtension: any = {}
    const parentFillLevel = useFillLevel()
    const size = (props as any).large
      ? 'large'
      : (props as any).small
      ? 'small'
      : 'medium'

    if (suffix) {
      themeExtension = mergeTheme(themeExtension, {
        Input: {
          Root: [{ paddingRight: 0 }],
          EndIcon: [{ ...startEndStyles, ...{ paddingLeft: 'xsmall' } }],
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

    return (
      <ExtendTheme theme={themeExtension}>
        <HonorableInput
          ref={ref}
          endIcon={
            endIcon || suffix ? (
              <>
                {endIcon}
                {suffix && <PrefixSuffix>{suffix}</PrefixSuffix>}
              </>
            ) : undefined
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
          {...props}
        />
      </ExtendTheme>
    )
  }
)

export default Input
