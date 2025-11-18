import {
  Icon as HonorableIcon,
  type IconProps as HonorableIconProps,
  useTheme,
} from 'honorable'
import { type ReactNode } from 'react'

type IconBaseProps = {
  size?: number | string
  color?: string
  fullColor?: boolean
  secondaryColor?: string
}

export type IconProps = HonorableIconProps & IconBaseProps

function createIcon(render: (props: IconBaseProps) => ReactNode) {
  function Icon({
    ref,
    size = 16,
    color = 'currentColor',
    fullColor,
    secondaryColor,
    ...props
  }: IconProps) {
    const theme = useTheme()
    const workingColor = theme.utils.resolveColorString(color)

    return (
      <HonorableIcon
        ref={ref}
        {...{ lineHeight: 0 }}
        {...{ '& *': { transition: 'stroke 150ms linear, fill 150ms linear' } }}
        {...props}
      >
        {render({
          size,
          color: workingColor,
          secondaryColor,
          fullColor,
        })}
      </HonorableIcon>
    )
  }

  return Icon
}

export default createIcon
