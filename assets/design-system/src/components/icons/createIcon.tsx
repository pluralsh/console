import {
  Icon as HonorableIcon,
  type IconProps as HonorableIconProps,
  useTheme,
} from 'honorable'
import { type ReactNode } from 'react'
import { useTheme as useStyledTheme } from 'styled-components'

import { DEFAULT_ICON_SIZE } from '../../theme/iconSizes'

type IconBaseProps = {
  size?: number | string
  color?: string
  fullColor?: boolean
  secondaryColor?: string
  mode?: string
}

export type IconProps = HonorableIconProps & IconBaseProps

function createIcon(render: (props: IconBaseProps) => ReactNode) {
  function Icon({
    ref,
    size,
    color = 'currentColor',
    fullColor,
    secondaryColor,
    ...props
  }: IconProps) {
    const theme = useTheme()
    const styledTheme = useStyledTheme()
    const workingColor = theme.utils?.resolveColorString(color)
    const resolvedSize =
      size ?? styledTheme.iconSizes?.medium ?? DEFAULT_ICON_SIZE

    return (
      <HonorableIcon
        ref={ref}
        {...{ lineHeight: 0 }}
        {...{ '& *': { transition: 'stroke 150ms linear, fill 150ms linear' } }}
        {...props}
      >
        {render({
          size: resolvedSize,
          color: workingColor,
          secondaryColor,
          fullColor,
          mode: theme.mode,
        })}
      </HonorableIcon>
    )
  }

  return Icon
}

export default createIcon
