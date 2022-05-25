import { ReactNode, Ref, forwardRef } from 'react'
import { Icon as HonorableIcon, IconProps as HonorableIconProps, useTheme } from 'honorable'
import PropTypes from 'prop-types'

type IconBaseProps = {
  size?: number
  color?: string
}

export type IconProps = HonorableIconProps & IconBaseProps

const propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
}

function createIcon(render: (props: IconBaseProps) => ReactNode) {
  function IconRef({ size = 16, color = 'currentColor', ...props }: IconProps, ref: Ref<any>) {
    const theme = useTheme()
    const workingColor = theme.utils.resolveColorString(color)

    return (
      <HonorableIcon
        ref={ref}
        {...{ '& *': { transition: 'stroke 150ms linear, fill 150ms linear' } }}
        {...props}
      >
        {render({ size, color: workingColor })}
      </HonorableIcon>
    )
  }

  const ForwardedIcon = forwardRef(IconRef)

  ForwardedIcon.propTypes = propTypes

  return ForwardedIcon
}

export default createIcon
