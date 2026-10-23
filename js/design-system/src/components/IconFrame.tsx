import {
  type ElementType,
  type ReactElement,
  type ReactNode,
  cloneElement,
} from 'react'
import styled, { DefaultTheme } from 'styled-components'

import { type SemanticColorKey } from '../theme/colors'
import { pxToRem } from '../theme/rem'
import { lightElevatedSurface } from '../theme/lightElevatedSurface'

import { type PolymorphicComponentProps } from '../types'

import Tooltip, { type TooltipProps } from './Tooltip'

type Size = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'
type Type = 'secondary' | 'tertiary' | 'floating'

function typeToBG(theme: DefaultTheme): Record<Type, string | undefined> {
  return {
    secondary: 'transparent',
    tertiary: 'transparent',
    floating:
      theme.mode === 'light'
        ? theme.colors['fill-zero']
        : theme.colors['fill-two'],
  }
}

function typeToHoverBG(theme: DefaultTheme): Record<Type, string | undefined> {
  return {
    secondary: theme.colors['action-input-hover'],
    tertiary: theme.colors['action-input-hover'],
    floating:
      theme.mode === 'light'
        ? theme.colors['fill-zero-hover']
        : theme.colors['fill-two-hover'],
  }
}

function typeToSelectedBG(
  theme: DefaultTheme
): Record<Type, string | undefined> {
  return {
    secondary: undefined,
    tertiary: undefined,
    floating:
      theme.mode === 'light'
        ? theme.colors['fill-zero-selected']
        : theme.colors['fill-two-selected'],
  }
}

function typeToFocusBG(theme: DefaultTheme): Record<Type, string | undefined> {
  return {
    secondary: undefined,
    tertiary: undefined,
    floating:
      theme.mode === 'light'
        ? theme.colors['fill-zero-selected']
        : theme.colors['fill-two-selected'],
  }
}

function typeToBorder(theme: DefaultTheme): Record<Type, string> {
  return {
    secondary:
      theme.mode === 'light' ? theme.borders['fill-two'] : theme.borders.input,
    tertiary: '1px solid transparent',
    floating:
      theme.mode === 'light' ? '1px solid transparent' : theme.borders.input,
  }
}

const ICON_FRAME_ICON_SIZE = {
  xsmall: 10,
  small: 12,
  medium: 16,
  large: 16,
  xlarge: 24,
} as const satisfies Record<Size, number>

const sizeToFrameSize: Record<Size, number> = {
  xsmall: 20,
  small: 24,
  medium: 32,
  large: 40,
  xlarge: 48,
}

type IconFrameBaseProps = {
  clickable?: boolean
  disabled?: Nullable<boolean>
  textValue?: string
  icon: ReactElement<any>
  iconSize?: number
  size?: Size
  tooltip?: boolean | ReactNode
  tooltipProps?: Partial<TooltipProps>
  type?: Type
  selected?: boolean
  background?: SemanticColorKey
  circle?: boolean
}

type IconFrameProps<E extends ElementType = 'div'> = PolymorphicComponentProps<
  E,
  IconFrameBaseProps
>

const IconFrameSC = styled.div<{
  $type: Type
  $clickable: boolean
  $selected: boolean
  $size: Size
  $background?: SemanticColorKey
  $circle?: boolean
}>(({ theme, $type, $clickable, $selected, $size, $background, $circle }) => ({
  display: 'flex',
  alignItems: 'center',
  alignContent: 'center',
  justifyContent: 'center',
  width: pxToRem(sizeToFrameSize[$size]),
  height: pxToRem(sizeToFrameSize[$size]),
  backgroundColor: $background
    ? theme.colors[$background]
    : $selected
      ? typeToSelectedBG(theme)[$type]
      : typeToBG(theme)[$type],
  border: typeToBorder(theme)[$type],
  borderRadius: $circle ? '50%' : theme.borderRadiuses.medium,
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
        '&[disabled]': {
          color: theme.colors['text-disabled'],
          cursor: 'not-allowed',
          ...($type !== 'tertiary' && { borderColor: theme.colors['border'] }),
          ...($type === 'floating' && {
            background: theme.colors['action-primary-disabled'],
          }),
        },
        '&:hover:not(:disabled)': {
          backgroundColor: $selected
            ? typeToSelectedBG(theme)[$type]
            : $clickable && typeToHoverBG(theme)[$type],
        },
      }
    : {}),
  ...($type === 'floating' && lightElevatedSurface(theme)),
  ...($type === 'floating' &&
    theme.mode !== 'light' && { boxShadow: theme.boxShadows.slight }),
}))

function IconFrame<E extends ElementType = 'div'>({
  icon,
  iconSize,
  size = 'medium',
  textValue = '',
  clickable = false,
  disabled = false,
  selected = false,
  tooltip,
  tooltipProps,
  type = 'tertiary',
  background,
  circle = false,
  as,
  ...props
}: IconFrameProps<E>) {
  icon = cloneElement(icon, {
    size: iconSize ?? ICON_FRAME_ICON_SIZE[size],
  })
  if (tooltip && typeof tooltip === 'boolean') {
    tooltip = textValue
  }
  let content = (
    <IconFrameSC
      $clickable={clickable}
      $selected={selected}
      $type={type}
      $size={size}
      $background={background}
      $circle={circle}
      aria-label={textValue}
      disabled={(clickable && disabled) || undefined}
      as={as || (clickable ? 'button' : undefined)}
      {...(clickable && {
        tabIndex: 0,
        role: 'button',
        type: 'button',
        'data-clickable': 'true',
      })}
      {...props}
    >
      {icon}
    </IconFrameSC>
  )

  if (tooltip) {
    content = (
      <Tooltip
        key={`${tooltip}`}
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

export default IconFrame
export { ICON_FRAME_ICON_SIZE }
export type { IconFrameProps }
