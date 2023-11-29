import { type FlexProps } from 'honorable'
import PropTypes from 'prop-types'
import {
  type ComponentProps,
  type ReactElement,
  type Ref,
  forwardRef,
} from 'react'
import styled, { type DefaultTheme, useTheme } from 'styled-components'

import { SEVERITIES } from '../types'

import { Spinner } from './Spinner'
import Card, { type BaseCardProps } from './Card'
import { type FillLevel, useFillLevel } from './contexts/FillLevelContext'
import CloseIcon from './icons/CloseIcon'

const HUES = ['default', 'lighter', 'lightest'] as const
const SIZES = ['small', 'medium', 'large'] as const

type ChipHue = (typeof HUES)[number]
type ChipSize = (typeof SIZES)[number]
type ChipSeverity = (typeof SEVERITIES)[number]

export type ChipProps = Omit<FlexProps, 'size'> &
  BaseCardProps & {
    size?: ChipSize
    severity?: ChipSeverity
    icon?: ReactElement
    loading?: boolean
    closeButton?: boolean
    clickable?: boolean
    [x: string]: unknown
  }

const propTypes = {
  size: PropTypes.oneOf(SIZES),
  severity: PropTypes.oneOf(SEVERITIES),
  hue: PropTypes.oneOf(HUES),
  icon: PropTypes.element,
  loading: PropTypes.bool,
} as const

const parentFillLevelToHue = {
  0: 'default',
  1: 'lighter',
  2: 'lightest',
  3: 'lightest',
} as const satisfies Record<FillLevel, ChipHue>

const hueToFillLevel: Record<ChipHue, FillLevel> = {
  default: 1,
  lighter: 2,
  lightest: 3,
}

const severityToColor = {
  neutral: 'text',
  info: 'text-primary-accent',
  success: 'text-success-light',
  warning: 'text-warning-light',
  danger: 'text-danger-light',
  critical: 'text-danger',
  // deprecated
  error: 'text-danger-light',
} as const satisfies Record<ChipSeverity, string>

const severityToIconColor = {
  neutral: 'icon-default',
  info: 'icon-info',
  success: 'icon-success',
  warning: 'icon-warning',
  danger: 'icon-danger',
  critical: 'icon-danger-critical',
  // deprecated
  error: 'icon-danger',
} as const satisfies Record<ChipSeverity, keyof DefaultTheme['colors']>

const sizeToCloseHeight = {
  small: 8,
  medium: 10,
  large: 12,
} as const satisfies Record<ChipSize, number>

const ChipCardSC = styled(Card)<{ $size: ChipSize; $severity: ChipSeverity }>(({
  $size,
  $severity,
  theme,
}) => {
  const textColor =
    theme.mode === 'light'
      ? theme.colors['text-light']
      : theme.colors[severityToColor[$severity]] || theme.colors.text

  return {
    '.closeIcon': {
      color: theme.colors['text-light'],
      paddingLeft: theme.spacing.xsmall,
    },
    '&:hover': {
      '.closeIcon': {
        color: theme.colors.text,
      },
    },
    '.spinner': {
      marginRight: theme.spacing.xsmall,
    },
    '.icon': {
      marginRight: theme.spacing.xsmall,
    },
    '.children': {
      display: 'flex',
      ...theme.partials.text.body2,
      color: textColor,
      fontSize: $size === 'small' ? 12 : 14,
      fontWeight: $size === 'small' ? 400 : 600,
      lineHeight: $size === 'small' ? '16px' : '20px',
      gap: 4,
    },
  }
})

function ChipRef(
  {
    children,
    size = 'medium',
    severity = 'neutral',
    hue,
    loading = false,
    icon,
    closeButton,
    clickable,
    as,
    ...props
  }: ChipProps & { as?: ComponentProps<typeof ChipCardSC>['forwardedAs'] },
  ref: Ref<any>
) {
  const parentFillLevel = useFillLevel()
  const theme = useTheme()

  hue = hue || parentFillLevelToHue[parentFillLevel]

  const iconCol = severityToIconColor[severity] || 'icon-default'

  return (
    <ChipCardSC
      severity={severity}
      ref={ref}
      cornerSize="medium"
      fillLevel={hueToFillLevel[hue]}
      clickable={clickable}
      paddingVertical={size === 'large' ? '6px' : 'xxxsmall'}
      paddingHorizontal={size === 'small' ? 'xsmall' : 'small'}
      alignItems="center"
      display="inline-flex"
      textDecoration="none"
      $size={size}
      $severity={severity}
      {...(as ? { forwardedAs: as } : {})}
      {...props}
    >
      {loading && (
        <Spinner
          className="spinner"
          color={theme.colors[iconCol]}
          size={size === 'large' ? 15 : 13}
        />
      )}
      {icon && (
        <icon.type
          className="icon"
          size={size === 'large' ? 15 : 13}
          color={theme.colors[iconCol]}
        />
      )}
      <div className="children">{children}</div>
      {closeButton && (
        <CloseIcon
          className="closeIcon"
          size={sizeToCloseHeight[size]}
        />
      )}
    </ChipCardSC>
  )
}

const Chip = forwardRef(ChipRef)

Chip.propTypes = propTypes

export default Chip
