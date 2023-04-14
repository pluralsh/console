import { ExtendTheme, Input as HonorableInput, mergeTheme } from 'honorable'
import type { InputProps as HonorableInputProps } from 'honorable'
import { ReactNode, forwardRef, useMemo } from 'react'
import { useTheme } from 'styled-components'

import { useFillLevel } from './contexts/FillLevelContext'
import { titleContentStyles } from './Select'

export type InputProps = HonorableInputProps & {
  suffix?: ReactNode
  prefix?: ReactNode
  titleContent?: ReactNode
}

const prefixSuffixIconStyle = {
  alignSelf: 'stretch',
  paddingHorizontal: 'small',
  backgroundColor: 'fill-two',
}

const Input = forwardRef(
  (
    { startIcon, endIcon, suffix, prefix, titleContent, ...props }: InputProps,
    ref
  ) => {
    let themeExtension: any = {}
    const theme = useTheme()
    const parentFillLevel = useFillLevel()
    const size = (props as any).large
      ? 'large'
      : (props as any).small
      ? 'small'
      : 'medium'

    const titleContentIconStyle = useMemo(
      () => ({
        ...titleContentStyles({ theme, parentFillLevel, size }),
        alignSelf: 'stretch',
      }),
      [parentFillLevel, theme, size]
    )

    if (suffix) {
      themeExtension = mergeTheme(themeExtension, {
        Input: {
          Root: [{ paddingRight: 0 }],
          EndIcon: [prefixSuffixIconStyle],
        },
      })
    }
    if (prefix) {
      themeExtension = mergeTheme(themeExtension, {
        Input: {
          Root: [{ paddingLeft: 0 }],
          StartIcon: [prefixSuffixIconStyle],
        },
      })
    }
    if (titleContent) {
      themeExtension = mergeTheme(themeExtension, {
        Input: {
          Root: [{ paddingLeft: 0 }],
          StartIcon: [titleContentIconStyle],
        },
      })
    }

    return (
      <ExtendTheme theme={themeExtension}>
        <HonorableInput
          ref={ref}
          endIcon={suffix || endIcon}
          startIcon={titleContent || prefix || startIcon}
          {...props}
        />
      </ExtendTheme>
    )
  }
)

export default Input
