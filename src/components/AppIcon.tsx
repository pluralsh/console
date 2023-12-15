import PropTypes from 'prop-types'
import {
  type ComponentProps,
  type ReactElement,
  type Ref,
  cloneElement,
  forwardRef,
} from 'react'
import { last } from 'lodash-es'

import styled, { type DefaultTheme, useTheme } from 'styled-components'

import { type ValueOf } from 'type-fest'

import { type styledTheme as theme } from '../theme'

import { type FillLevel, useFillLevel } from './contexts/FillLevelContext'

const HUES = ['default', 'lighter', 'lightest'] as const
const SIZES = [
  'xxsmall',
  'xsmall',
  'small',
  'medium',
  'large',
  'xlarge',
] as const
const SPACINGS = ['none', 'padding'] as const

type AppIconHue = (typeof HUES)[number]
type AppIconSize = (typeof SIZES)[number]
type AppIconSpacing = (typeof SPACINGS)[number]

type AppIconProps = {
  size?: AppIconSize
  spacing?: AppIconSpacing
  hue?: AppIconHue
  clickable?: boolean
  url?: string
  icon?: ReactElement
  alt?: string
  name?: string
  initials?: string
  className?: string
  onClose?: () => void
}

const propTypes = {
  size: PropTypes.oneOf(SIZES),
  spacing: PropTypes.oneOf(SPACINGS),
  hue: PropTypes.oneOf(HUES),
  clickable: PropTypes.bool,
  url: PropTypes.string,
  IconComponent: PropTypes.elementType,
  alt: PropTypes.string,
} as const

const parentFillLevelToHue = {
  0: 'default',
  1: 'lighter',
  2: 'lightest',
  3: 'lightest',
} as const satisfies Record<FillLevel, AppIconHue>

const sizeToWidth = {
  xxsmall: 32,
  xsmall: 48,
  small: 64,
  medium: 96,
  large: 140,
  xlarge: 160,
} as const satisfies Record<AppIconSize, number>

const sizeToIconWidth = {
  xxsmall: 16,
  xsmall: 32,
  small: 48,
  medium: 64,
  large: 76,
  xlarge: 96,
} as const satisfies Record<AppIconSize, number>

const hueToColor = {
  default: 'fill-one',
  lighter: 'fill-two',
  lightest: 'fill-three',
} as const satisfies Record<AppIconHue, string>

const hueToBorderColor = {
  default: 'border',
  lighter: 'border-fill-two',
  lightest: 'border-fill-three',
} as const satisfies Record<AppIconHue, keyof typeof theme.colors>

const sizeToFont = (size: AppIconSize, theme: DefaultTheme) =>
  ({
    xxsmall: {
      ...theme.partials.text.body2Bold,
      fontSize: 12,
    },
    xsmall: theme.partials.text.body2Bold,
    small: theme.partials.text.subtitle2,
    medium: theme.partials.text.subtitle1,
    large: theme.partials.text.title2,
    xlarge: theme.partials.text.title2,
  })[size]

export function toInitials(name: string) {
  let initials = name
    .trim()
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())

  if (initials.length > 2) {
    initials = [initials[0], last(initials)]
  }

  return initials.join('')
}

const AppIconSC = styled.div<{
  $color: ValueOf<typeof hueToColor>
  $borderColor: ValueOf<typeof hueToBorderColor>
  $hasBorder: boolean
  $boxSize: number
  $clickable: boolean
}>(({ theme, $color, $borderColor, $hasBorder, $boxSize, $clickable }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.colors[$color],
  borderRadius: theme.borderRadiuses.medium,
  border: $hasBorder ? theme.borders.default : 'none',
  borderColor: theme.colors[$borderColor],
  width: $boxSize,
  height: $boxSize,
  minWidth: $boxSize,
  minHeight: $boxSize,
  cursor: $clickable ? 'pointer' : 'auto',
  overflow: 'hidden',
  _hover: $clickable ? { backgroundColor: $borderColor } : null,
}))

const InitialsSC = styled.div<{
  $size: AppIconSize
}>(({ theme, $size }) => ({
  display: 'flex',
  width: '100%',
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  textTransform: 'uppercase',
  ...sizeToFont($size, theme),
}))

const ImgSC = styled.img<{
  $iconWidth: number
}>(({ $iconWidth }) => ({
  width: $iconWidth,
  height: $iconWidth,
  objectFit: 'cover',
}))

function AppIconRef(
  {
    size = 'medium',
    spacing = 'padding',
    hue,
    clickable = false,
    url,
    icon = null,
    alt,
    name,
    initials,
    onClose,
    ...props
  }: AppIconProps & ComponentProps<typeof AppIconSC>,
  ref: Ref<any>
) {
  const theme = useTheme()
  const parentFillLevel = useFillLevel()

  hue = hue || parentFillLevelToHue[parentFillLevel]
  const boxSize = sizeToWidth[size]
  const iconWidth =
    spacing === 'padding' ? sizeToIconWidth[size] : sizeToWidth[size] + 1
  const color = hueToColor[hue]
  const borderColor = hueToBorderColor[hue]
  const hasBorder = spacing === 'padding'

  if (icon) {
    icon = cloneElement(icon, {
      color: theme.colors['icon-default'],
      width: iconWidth,
      ...(icon?.props || {}),
    })
  }

  return (
    <AppIconSC
      $color={color}
      $borderColor={borderColor}
      $hasBorder={hasBorder}
      $boxSize={boxSize}
      $clickable={clickable}
      onClick={clickable ? onClose : null}
      {...props}
    >
      {url ? (
        <ImgSC
          ref={ref}
          src={url}
          alt={alt}
          $iconWidth={iconWidth}
        />
      ) : (
        icon || (
          <InitialsSC $size={size}>
            {initials || (name ? toInitials(name) : '')}
          </InitialsSC>
        )
      )}
    </AppIconSC>
  )
}

const AppIcon = forwardRef(AppIconRef)

AppIcon.propTypes = propTypes

export default AppIcon
export type { AppIconProps }
