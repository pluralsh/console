import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  cloneElement,
  forwardRef,
} from 'react'
import { ButtonBase, Flex, type FlexProps } from 'honorable'
import styled from 'styled-components'

import { type styledTheme } from '../theme'

import Tooltip, { type TooltipProps } from './Tooltip'

type Size = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'
type Type = 'secondary' | 'tertiary' | 'floating'

function typeToBG(theme: typeof styledTheme): Record<Type, string> {
  return {
    secondary: 'transparent',
    tertiary: 'transparent',
    floating:
      theme.mode === 'light'
        ? theme.colors['fill-three']
        : theme.colors['fill-two'],
  }
}

function typeToHoverBG(theme: typeof styledTheme): Record<Type, string> {
  return {
    secondary: theme.colors['action-input-hover'],
    tertiary: theme.colors['action-input-hover'],
    floating:
      theme.mode === 'light'
        ? theme.colors['fill-three-hover']
        : theme.colors['fill-two-hover'],
  }
}

function typeToSelectedBG(theme: typeof styledTheme): Record<Type, string> {
  return {
    secondary: undefined,
    tertiary: undefined,
    floating:
      theme.mode === 'light'
        ? theme.colors['fill-three-selected']
        : theme.colors['fill-two-selected'],
  }
}

function typeToFocusBG(theme: typeof styledTheme): Record<Type, string> {
  return {
    secondary: undefined,
    tertiary: undefined,
    floating:
      theme.mode === 'light'
        ? theme.colors['fill-three-selected']
        : theme.colors['fill-two-selected'],
  }
}

function typeToBorder(theme: typeof styledTheme): Record<Type, string> {
  return {
    secondary:
      theme.mode === 'light' ? theme.borders['fill-two'] : theme.borders.input,
    tertiary: '1px solid transparent',
    floating:
      theme.mode === 'light' ? theme.borders['fill-two'] : theme.borders.input,
  }
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
  selected?: boolean
}

const IconFrameSC = styled(Flex)<{
  $type: Type
  $clickable: boolean
  $selected: boolean
  $size: Size
}>(({ theme, $type, $clickable, $selected, $size }) => ({
  alignItems: 'center',
  justifyContent: 'center',
  width: sizeToFrameSize[$size],
  height: sizeToFrameSize[$size],
  backgroundColor: $selected
    ? typeToSelectedBG(theme)[$type]
    : typeToBG(theme)[$type],
  border: typeToBorder(theme)[$type],
  borderRadius: theme.borderRadiuses.medium,

  '&:focus,&:focus-visible': { outline: 'none' },
  '&:focus-visible,&:hover:focus-visible': {
    ...theme.partials.focus.default,
    ...(typeToFocusBG(theme)[$type]
      ? { backgroundColor: typeToFocusBG(theme)[$type] }
      : {}),
  },
  '&,&:any-link': {
    textDecoration: 'none',
    color: 'unset',
    appearance: 'unset',
  },
  ...($clickable
    ? {
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: $selected
            ? typeToSelectedBG(theme)[$type]
            : $clickable && typeToHoverBG(theme)[$type],
        },
      }
    : {}),
  ...($type === 'floating'
    ? {
        boxShadow:
          theme.mode === 'light'
            ? theme.boxShadows.slight
            : theme.boxShadows.moderate,
      }
    : {}),
}))

const IconFrame = forwardRef<
  HTMLDivElement,
  IconFrameProps & ComponentProps<typeof IconFrameSC>
>(
  (
    {
      icon,
      size = 'medium',
      textValue = '',
      clickable = false,
      selected = false,
      tooltip,
      tooltipProps,
      type = 'tertiary',
      as,
      ...props
    },
    ref
  ) => {
    icon = cloneElement(icon, { size: sizeToIconSize[size] })
    if (tooltip && typeof tooltip === 'boolean') {
      tooltip = textValue
    }
    const forwardedAs = as || (clickable ? ButtonBase : undefined)

    let content = (
      <IconFrameSC
        $clickable={clickable}
        $selected={selected}
        $type={type}
        $size={size}
        ref={ref}
        flex={false}
        aria-label={textValue}
        {...(forwardedAs ? { forwardedAs } : {})}
        {...(clickable && {
          tabIndex: 0,
          role: 'button',
          type: 'button',
        })}
        {...props}
      >
        {icon}
      </IconFrameSC>
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
