import { Flex, FlexProps, Spinner } from 'honorable'
import PropTypes from 'prop-types'
import { ReactElement, Ref, forwardRef } from 'react'
import styled from 'styled-components'

import Card, { CardProps } from './Card'
import { FillLevel, useFillLevel } from './contexts/FillLevelContext'
import CloseIcon from './icons/CloseIcon'

type Hue = 'default' | 'lighter' | 'lightest'
type Size = 'small' | 'medium' | 'large'
type Severity =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'critical'

export type ChipProps = FlexProps & {
  size?: 'small' | 'medium' | 'large' | string
  severity?: Severity | string
  icon?: ReactElement
  loading?: boolean
  closeButton?: boolean
  clickable?: boolean
} & CardProps

const parentFillLevelToHue: Record<FillLevel, Hue> = {
  0: 'default',
  1: 'lighter',
  2: 'lightest',
  3: 'lightest',
}

const severityToColor: Record<Severity, string> = {
  neutral: 'text',
  info: 'text-primary-accent',
  success: 'text-success-light',
  warning: 'text-warning-light',
  error: 'text-danger-light',
  critical: 'text-danger',
}

const severityToIconColor: Record<Severity, string> = {
  neutral: 'icon-default',
  info: 'icon-info',
  success: 'icon-success',
  warning: 'icon-warning',
  error: 'icon-danger',
  critical: 'icon-danger-critical',
}

const sizeToCloseHeight: Record<Size, number> = {
  small: 8,
  medium: 10,
  large: 12,
}

const ChipCard = styled(Card)(({ theme }) => ({
  '.closeIcon': {
    color: theme.colors['text-light'],
  },
  '&:hover': {
    '.closeIcon': {
      color: theme.colors.text,
    },
  },
}))

function ChipRef({
  children,
  size = 'medium',
  severity = 'neutral',
  hue,
  loading = false,
  icon,
  closeButton,
  clickable,
  ...props
}: ChipProps,
ref: Ref<any>) {
  const parentFillLevel = useFillLevel()

  hue = hue || parentFillLevelToHue[parentFillLevel]
  const col = severityToColor[severity] || 'text'
  const iconCol = severityToIconColor[severity] || 'icon-default'

  return (
    <ChipCard
      ref={ref}
      cornerSize="medium"
      hue={hue}
      clickable={clickable}
      paddingVertical={size === 'large' ? '6px' : 'xxxsmall'}
      paddingHorizontal={size === 'small' ? 'xsmall' : 'small'}
      alignItems="center"
      display="inline-flex"
      {...props}
    >
      {loading && (
        <Spinner
          color={iconCol}
          size={size === 'large' ? 15 : 13}
          marginRight="xsmall"
        />
      )}
      {icon && (
        <icon.type
          size={size === 'large' ? 15 : 13}
          marginRight="xsmall"
          color={iconCol}
        />
      )}
      <Flex
        body2
        color={col}
        fontSize={size === 'small' ? 12 : 14}
        fontWeight={size === 'small' ? 400 : 600}
        lineHeight={size === 'small' ? '16px' : '20px'}
        gap={4}
      >
        {children}
      </Flex>
      {closeButton && (
        <CloseIcon
          className="closeIcon"
          paddingLeft="xsmall"
          size={sizeToCloseHeight[size]}
          _hover={{ color: 'blue' }}
        />
      )}
    </ChipCard>
  )
}

const Chip = forwardRef(ChipRef)

Chip.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  severity: PropTypes.oneOf([
    'neutral',
    'info',
    'success',
    'warning',
    'error',
    'critical',
  ]),
  hue: PropTypes.oneOf(['default', 'lighter', 'lightest']),
  icon: PropTypes.element,
  loading: PropTypes.bool,
}

export default Chip
