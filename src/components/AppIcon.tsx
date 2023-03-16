import { DivProps, Flex, Img } from 'honorable'
import PropTypes from 'prop-types'
import { ReactNode, Ref, forwardRef } from 'react'
import { CSSObject } from 'styled-components'
import last from 'lodash/last'

import { styledTheme as theme } from '../theme'

import { FillLevel, useFillLevel } from './contexts/FillLevelContext'

type Hue = 'default' | 'lighter' | 'lightest'
type Size = 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'

type AppIconProps = DivProps & {
  size?: Size | string
  spacing?: 'none' | 'padding' | string
  hue?: 'default' | 'lighter' | 'lightest' | string
  clickable?: boolean
  url?: string
  icon?: ReactNode
  alt?: string
  name?: string
  initials?: string
  onClose?: () => void
}

const propTypes = {
  size: PropTypes.oneOf([
    'xxsmall',
    'xsmall',
    'small',
    'medium',
    'large',
    'xlarge',
  ]),
  spacing: PropTypes.oneOf(['none', 'padding']),
  hue: PropTypes.oneOf(['default', 'lighter', 'lightest']),
  clickable: PropTypes.bool,
  url: PropTypes.string,
  IconComponent: PropTypes.elementType,
  alt: PropTypes.string,
}

const parentFillLevelToHue: Record<FillLevel, Hue> = {
  0: 'default',
  1: 'lighter',
  2: 'lightest',
  3: 'lightest',
}

const sizeToWidth: Record<Size, number> = {
  xxsmall: 32,
  xsmall: 48,
  small: 64,
  medium: 96,
  large: 140,
  xlarge: 160,
}

const sizeToIconWidth: Record<Size, number> = {
  xxsmall: 16,
  xsmall: 32,
  small: 48,
  medium: 64,
  large: 76,
  xlarge: 96,
}

const hueToColor: Record<Hue, string> = {
  default: 'fill-one',
  lighter: 'fill-two',
  lightest: 'fill-three',
}

const hueToBorderColor: {
  [key in 'default' | 'lighter' | 'lightest']: string
} = {
  default: 'border',
  lighter: 'border-fill-two',
  lightest: 'border-fill-three',
}

const sizeToFont: {
  [key in 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge']: CSSObject
} = {
  xsmall: theme.partials.text.body2Bold,
  small: theme.partials.text.subtitle2,
  medium: theme.partials.text.subtitle1,
  large: theme.partials.text.title2,
  xlarge: theme.partials.text.title2,
}

export function toInitials(name: string) {
  let initials = name
    .trim()
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())

  if (initials.length > 2) {
    initials = [initials[0], last(initials)]
  }

  return initials.join('')
}

function AppIconRef({
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
}: AppIconProps,
ref: Ref<any>) {
  const parentFillLevel = useFillLevel()

  hue = hue || parentFillLevelToHue[parentFillLevel]
  const boxSize = sizeToWidth[size]
  const iconSize
    = spacing === 'padding' ? sizeToIconWidth[size] : sizeToWidth[size] + 1
  const color = hueToColor[hue]
  const borderColor = hueToBorderColor[hue]
  const hasBorder = spacing === 'padding'

  return (
    <Flex
      backgroundColor={color}
      borderRadius="medium"
      border={hasBorder ? '1px solid border' : 'none'}
      borderColor={borderColor}
      width={boxSize}
      height={boxSize}
      minWidth={boxSize}
      minHeight={boxSize}
      align="center"
      justify="center"
      cursor={clickable ? 'pointer' : 'auto'}
      overflow="hidden"
      _hover={clickable ? { backgroundColor: borderColor } : null}
      onClick={clickable ? onClose : null}
    >
      {url ? (
        <Img
          ref={ref}
          src={url}
          alt={alt}
          width={iconSize}
          height={iconSize}
          objectFit="cover"
          {...props}
        />
      ) : icon || (
        <Flex
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
          userSelect="none"
          textTransform="uppercase"
          {...sizeToFont[size]}
        >
          {initials || (name ? toInitials(name) : '')}
        </Flex>
      )}
    </Flex>
  )
}

const AppIcon = forwardRef(AppIconRef)

AppIcon.propTypes = propTypes

export default AppIcon
export type { AppIconProps }
