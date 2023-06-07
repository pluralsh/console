import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  forwardRef,
} from 'react'
import { ButtonBase, Flex, type FlexProps } from 'honorable'
import { useTheme } from 'styled-components'

import { type styledTheme } from '../theme'

import Tooltip, { type TooltipProps } from './Tooltip'

type Size = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'
type Type = 'secondary' | 'tertiary' | 'floating'

const typeToBG: Record<Type, string> = {
  secondary: 'transparent',
  tertiary: 'transparent',
  floating: 'fill-two',
}

const typeToHoverBG: Record<Type, keyof typeof styledTheme.colors> = {
  secondary: 'action-input-hover',
  tertiary: 'action-input-hover',
  floating: 'fill-two-hover',
}

const typeToBorder: Record<Type, string> = {
  secondary: '1px solid border-input',
  tertiary: '1px solid transparent',
  floating: '1px solid border-input',
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
  clickable?: boolean
  textValue?: string
  icon: ReactElement
  size?: Size
  tooltip?: boolean | ReactNode
  tooltipProps?: Partial<TooltipProps>
  type?: Type
}

const IconFrame = forwardRef<HTMLDivElement, IconFrameProps>(
  (
    {
      icon,
      size = 'medium',
      textValue = '',
      clickable = false,
      tooltip,
      tooltipProps,
      type = 'tertiary',
      ...props
    },
    ref
  ) => {
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
        backgroundColor={typeToBG[type]}
        border={typeToBorder[type]}
        borderRadius={theme.borderRadiuses.medium}
        aria-label={textValue}
        {...{ '&:focus,&:focus-visible': { outline: 'none' } }}
        _focusVisible={{ ...theme.partials.focus.default }}
        {...{
          '&,&:any-link': {
            textDecoration: 'none',
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
            backgroundColor: clickable && theme.colors[typeToHoverBG[type]],
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
  }
)

export default IconFrame
export type { IconFrameProps }
