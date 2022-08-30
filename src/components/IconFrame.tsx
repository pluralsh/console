import {
  ReactElement, ReactNode, cloneElement, forwardRef,
} from 'react'
import { ButtonBase, Flex, FlexProps } from 'honorable'
import { useTheme } from 'styled-components'

import Tooltip, { TooltipProps } from './Tooltip'

type Hue = 'none' | 'default' | 'lighter' | 'lightest'
type Size = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'

const hueToHoverBG: Record<Hue, string> = {
  none: 'fill-zero-hover',
  default: 'fill-one-hover',
  lighter: 'fill-two-hover',
  lightest: 'fill-three-hover',
}

const sizeToIconSize: Record<Size, number> = {
  xsmall: 8,
  small: 16,
  medium: 16,
  large: 24,
  xlarge: 24,
}

const sizeToFrameSize: Record<Size, number> = {
  xsmall: 16,
  small: 24,
  medium: 32,
  large: 40,
  xlarge: 48,
}

type IconFrameProps = Omit<FlexProps, 'size'> & {
  hue?: Hue
  clickable?: boolean
  textValue: string
  icon: ReactElement
  size?: Size
  tooltip?: boolean | ReactNode
  tooltipProps?: TooltipProps
}

const IconFrame = forwardRef<HTMLDivElement, IconFrameProps>(({
  icon,
  size = 'medium',
  hue = 'default',
  textValue,
  clickable = false,
  tooltip,
  tooltipProps,
  ...props
},
ref) => {
  const theme = useTheme()

  icon = cloneElement(icon, { size: sizeToIconSize[size] })
  if (tooltip && typeof tooltip === 'boolean') {
    tooltip = textValue
  }

  let content = (
    <Flex
      ref={ref}
      flex={false}
      alignItems="center"
      justifyContent="center"
      width={sizeToFrameSize[size]}
      height={sizeToFrameSize[size]}
      borderRadius={theme.borderRadiuses.medium}
      aria-label={textValue}
      {...{ '&:focus,&:focus-visible': { outline: 'none' } }}
      _focusVisible={{ ...theme.partials.focus.default }}
      {...{
        '&,&:any-link': {
          textDecoration: 'none',
          border: 'unset',
          background: 'unset',
          color: 'unset',
          appearance: 'unset',
        },
      }}
      {...(clickable && {
        as: ButtonBase,
        tabIndex: 0,
        role: 'button',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor:
              clickable
              && (theme.colors[hueToHoverBG[hue]]
                || theme.colors[hueToHoverBG.default]),
        },
      })}
      {...props}
    >
      {icon}
    </Flex>
  )

  if (tooltip) {
    content = (
      <Tooltip
        displayOn="hover"
        arrow
        placement="top"
        label={tooltip}
        {...tooltipProps}
      >
        {content}
      </Tooltip>
    )
  }

  return content
})

export default IconFrame
export { IconFrameProps }
