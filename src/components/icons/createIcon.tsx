import { Icon as HonorableIcon, useTheme } from 'honorable'

export type IconProps = typeof HonorableIcon & {
  size?: number
  color?: string
}

function createIcon(render: (props: IconProps) => JSX.Element) {
  function Icon({ size = 16, color = 'white', ...props }) {
    const theme = useTheme()
    const workingColor = theme.utils.resolveColor(color) as string

    return (
      <HonorableIcon {...props}>
        {// @ts-ignore
          render({ size, color: workingColor, ...props })
        }
      </HonorableIcon>
    )
  }

  return Icon
}

export default createIcon
