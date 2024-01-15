import { ExtendTheme, Input, InputProps } from 'honorable'
import { forwardRef } from 'react'
import { useTheme } from 'styled-components'

import { useFillLevel } from '@pluralsh/design-system'

import { fillLevelToBorderColor } from './List'

const ListInput = forwardRef<HTMLDivElement, InputProps>(
  ({ ...props }, ref) => {
    const theme = useTheme()
    const bRad = theme.borderRadiuses.large - 2
    const fillLevel = useFillLevel()

    const themeExtension: any = {
      Input: {
        Root: [
          {
            position: 'relative',
            border: 'none',
            borderBottomStyle: 'solid',
            borderColor:
              theme.colors[fillLevelToBorderColor[fillLevel]] || 'transparent',
            borderWidth: '1px',
            borderRadius: 0,
            '&:focus-within': {
              outline: 'none',
            },
            '&:focus-within:after': {
              borderRadius: `${bRad}px ${bRad}px 0 0`,
              ...theme.partials.focus.insetAbsolute,
            },
          },
        ],
      },
    }

    return (
      <ExtendTheme theme={themeExtension}>
        <Input
          ref={ref}
          {...props}
        />
      </ExtendTheme>
    )
  }
)

export default ListInput
