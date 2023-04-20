import { type ReactNode, type Ref, forwardRef } from 'react'
import {
  Icon as HonorableIcon,
  type IconProps as HonorableIconProps,
  useTheme,
} from 'honorable'
import PropTypes from 'prop-types'

type IconBaseProps = {
  size?: number | string
  color?: string
  fullColor?: boolean
}

export type IconProps = HonorableIconProps & IconBaseProps

const propTypes = {
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  color: PropTypes.string,
  fullColor: PropTypes.bool,
}

function createIcon(render: (props: IconBaseProps) => ReactNode) {
  function IconRef(
    { size = 16, color = 'currentColor', fullColor, ...props }: IconProps,
    ref: Ref<any>
  ) {
    const theme = useTheme()
    const workingColor = theme.utils.resolveColorString(color)

    return (
      <HonorableIcon
        ref={ref}
        {...{ '& *': { transition: 'stroke 150ms linear, fill 150ms linear' } }}
        {...props}
      >
        {render({ size, color: workingColor, fullColor })}
      </HonorableIcon>
    )
  }

  const ForwardedIcon = forwardRef(IconRef)

  ForwardedIcon.propTypes = propTypes

  return ForwardedIcon
}

export default createIcon
