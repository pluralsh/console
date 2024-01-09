import { type ReactNode, type Ref, forwardRef } from 'react'
import {
  Icon as HonorableIcon,
  type IconProps as HonorableIconProps,
  useTheme,
} from 'honorable'

type IconBaseProps = {
  size?: number | string
  color?: string
  fullColor?: boolean
  secondaryColor?: string
}

export type IconProps = HonorableIconProps & IconBaseProps

function createIcon(render: (props: IconBaseProps) => ReactNode) {
  function IconRef(
    {
      size = 16,
      color = 'currentColor',
      fullColor,
      secondaryColor,
      ...props
    }: IconProps,
    ref: Ref<any>
  ) {
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

  const ForwardedIcon = forwardRef(IconRef)

  return ForwardedIcon
}

export default createIcon
