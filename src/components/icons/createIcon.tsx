import { ReactNode } from 'react'
import { Icon as HonorableIcon, IconProps as HonorableIconProps, useTheme } from 'honorable'

export type IconProps = HonorableIconProps & {
  size?: number
  color?: string
}

function createIcon(render: (props: IconProps) => ReactNode) {
  function Icon({ size = 16, color = 'white', ...props }) {
    const theme = useTheme()
    const workingColor = theme.utils.resolveColor(color) as string

    return (
      <HonorableIcon {...props}>
        {render({ size, color: workingColor })}
      </HonorableIcon>
    )
  }

  return Icon
}

export default createIcon
