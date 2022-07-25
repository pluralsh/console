import { ExtendTheme, Input as HonorableInput, mergeTheme } from 'honorable'
import type { InputProps as HonorableInputProps } from 'honorable'
import type { ReactNode } from 'react'

export type InputProps = HonorableInputProps & {
    suffix?: ReactNode,
    prefix?: ReactNode,
}

const prefixSuffixIconStyle = {
  alignSelf: 'stretch',
  paddingHorizontal: 'small',
  backgroundColor: 'fill-two',
}

export default function Input({
  startIcon, endIcon, suffix, prefix, ...props
} : InputProps) {
  let themeExtension:any = {}

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

  return (
    <ExtendTheme theme={themeExtension}>
      <HonorableInput
        endIcon={suffix || endIcon}
        startIcon={prefix || startIcon}
        {...props}
      />
    </ExtendTheme>
  )
}
