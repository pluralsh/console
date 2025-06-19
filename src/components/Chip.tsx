import { type FlexProps } from 'honorable'
import {
  type ComponentProps,
  type ComponentPropsWithRef,
  type ReactElement,
} from 'react'
import styled, { type DefaultTheme, useTheme } from 'styled-components'

import { type SEVERITIES } from '../types'

import Card, {
  type BaseCardProps,
  type CardFillLevel,
  useDecideFillLevel,
} from './Card'
import CloseIcon from './icons/CloseIcon'
import { Spinner } from './Spinner'
import Tooltip from './Tooltip'

export const CHIP_CLOSE_ATTR_KEY = 'data-close-button' as const
export type ChipSize = 'small' | 'medium' | 'large'
export type ChipSeverity = (typeof SEVERITIES)[number]

export type ChipProps = Omit<FlexProps, 'size'> &
  BaseCardProps & {
    size?: ChipSize
    condensed?: boolean
    severity?: ChipSeverity
    inactive?: boolean
    icon?: ReactElement<any>
    loading?: boolean
    closeButton?: boolean
    closeButtonProps?: ComponentPropsWithRef<'div'>
    clickable?: boolean
    truncateWidth?: number
    truncateEdge?: 'start' | 'end'
    tooltip?: boolean | ComponentProps<typeof Tooltip>['label']
    tooltipProps?: ComponentProps<typeof Tooltip>
    [x: string]: unknown
  } & ({ severity?: ChipSeverity } | { severity: 'error' })

export const severityToColor = {
  neutral: 'text',
  info: 'text-primary-accent',
  success: 'text-success-light',
  successDark: 'text-success',
  warning: 'text-warning-light',
  danger: 'text-danger-light',
  critical: 'text-danger',
  // @ts-expect-error deprecated, should match 'danger'
  error: 'text-danger-light',
} as const satisfies Record<ChipSeverity, string>

export const severityToIconColor = {
  neutral: 'icon-default',
  info: 'icon-info',
  success: 'icon-success',
  successDark: 'icon-success',
  warning: 'icon-warning',
  danger: 'icon-danger',
  critical: 'icon-danger-critical',
  // @ts-expect-error deprecated, should match 'danger'
  error: 'icon-danger',
} as const satisfies Record<ChipSeverity, keyof DefaultTheme['colors']>

const sizeToCloseHeight = {
  small: 8,
  medium: 10,
  large: 12,
} as const satisfies Record<ChipSize, number>

const ChipCardSC = styled(Card)<{
  $size: ChipSize
  $severity: ChipSeverity
  $inactive: boolean
  $truncateWidth?: number
  $truncateEdge?: 'start' | 'end'
  $condensed?: boolean
}>(({
  $size,
  $severity,
  $inactive,
  $truncateWidth,
  $truncateEdge,
  $condensed,
  theme,
}) => {
  const textColor = $inactive
    ? theme.colors['text-xlight']
    : theme.colors[severityToColor[$severity]] ?? theme.colors.text

  return {
    '&&': {
      backgroundColor: $inactive ? 'transparent' : undefined,
      padding: `${$size === 'large' ? 6 : theme.spacing.xxxsmall}px ${
        $size === 'large' && $condensed
          ? 6
          : $size === 'small'
          ? $condensed
            ? 6
            : theme.spacing.xsmall
          : $condensed
          ? theme.spacing.xsmall
          : theme.spacing.small
      }px`,
      alignItems: 'center',
      display: 'inline-flex',
      textDecoration: 'none',
      gap: $condensed ? 6 : theme.spacing.xsmall,
    },
    '.children': {
      display: 'flex',
      ...theme.partials.text.body2,
      color: textColor,
      fontSize: $size === 'small' ? 12 : 14,
      fontWeight: $size === 'small' ? 400 : 600,
      lineHeight: $size === 'small' ? '16px' : '20px',
      gap: theme.spacing.xxsmall,
      ...($condensed
        ? {
            letterSpacing: $condensed ? '-0.025em' : undefined,
          }
        : {}),
      ...($truncateWidth
        ? {
            display: 'block',
            maxWidth: $truncateWidth,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            ...($truncateEdge === 'start'
              ? { direction: 'rtl', textAlign: 'left' }
              : {}),
          }
        : {}),
    },
  }
})

const CloseButtonSC = styled.button<{
  $fillLevel: CardFillLevel
}>(({ theme, $fillLevel }) => ({
  ...theme.partials.reset.button,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: theme.borderRadiuses.medium,
  padding: theme.spacing.xsmall - theme.spacing.xxsmall,
  margin: -(theme.spacing.xsmall - theme.spacing.xxsmall),
  '.closeIcon': {
    color: theme.colors['text-light'],
  },
  '&:focus-visible': {
    ...theme.partials.focus.outline,
  },
  '&:not(:disabled)': {
    '&:focus-visible, &:hover, [data-clickable=true]:hover > &': {
      backgroundColor:
        theme.colors[
          `fill-${
            $fillLevel === 3 ? 'three' : $fillLevel === 2 ? 'two' : 'one'
          }-hover`
        ],
      '.closeIcon': {
        color: theme.colors.text,
      },
    },
  },
}))

function Chip({
  children,
  size = 'medium',
  condensed = false,
  severity = 'neutral',
  inactive = false,
  truncateWidth,
  truncateEdge,
  fillLevel,
  loading = false,
  icon,
  closeButton,
  closeButtonProps,
  clickable,
  disabled,
  tooltip,
  tooltipProps,
  ...props
}: ChipProps) {
  fillLevel = useDecideFillLevel({ fillLevel })
  const theme = useTheme()

  const iconCol = severityToIconColor[severity] || 'icon-default'

  let content = (
    <ChipCardSC
      severity={severity}
      cornerSize="medium"
      fillLevel={fillLevel}
      clickable={clickable}
      disabled={clickable && disabled}
      $inactive={inactive}
      $size={size}
      $condensed={condensed}
      $severity={severity}
      $truncateWidth={truncateWidth}
      $truncateEdge={truncateEdge}
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
        <CloseButtonSC
          disabled={disabled}
          $fillLevel={fillLevel}
          {...{
            [CHIP_CLOSE_ATTR_KEY]: '',
          }}
          {...(clickable ? { as: 'div' } : {})}
          {...(closeButtonProps || {})}
        >
          <CloseIcon
            className="closeIcon"
            size={sizeToCloseHeight[size]}
          />
        </CloseButtonSC>
      )}
    </ChipCardSC>
  )

  if (tooltip) {
    content = (
      <Tooltip
        displayOn="hover"
        arrow
        placement="top"
        label={typeof tooltip === 'boolean' ? children : tooltip}
        {...tooltipProps}
      >
        {content}
      </Tooltip>
    )
  }

  return content
}

export default Chip
