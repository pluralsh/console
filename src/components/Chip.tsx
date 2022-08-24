import { Flex, FlexProps, Spinner } from 'honorable'
import PropTypes from 'prop-types'
import { ReactElement, Ref, forwardRef } from 'react'
import styled from 'styled-components'

import Card, { CardProps } from './Card'
import CloseIcon from './icons/CloseIcon'

type ChipProps = FlexProps & {
  size?: 'small' | 'medium' | 'large' | string
  severity?:
    | 'neutral'
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'critical'
    | string
  icon?: ReactElement
  loading?: boolean
  closeButton?: boolean
  clickable?: boolean
} & CardProps

const propTypes = {
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

const severityToColor = {
  neutral: 'text-light',
  info: 'text-primary-accent',
  success: 'text-success-light',
  warning: 'text-warning-light',
  error: 'text-error-light',
  critical: 'text-error',
}

const sizeToCloseHeight: { [key in 'small' | 'medium' | 'large']: number } = {
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
  hue = 'default',
  loading = false,
  icon,
  closeButton,
  clickable,
  ...props
}: ChipProps,
ref: Ref<any>) {
  const col = severityToColor[severity] || 'text-light'

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
          color={col}
          size={size === 'large' ? 15 : 13}
          marginRight="xsmall"
        />
      )}
      {icon && (
        <icon.type
          size={size === 'large' ? 15 : 13}
          marginRight="xsmall"
          color={col}
        />
      )}
      <Flex
        body2
        color={col}
        fontSize={size === 'small' ? 12 : 14}
        fontWeight={size === 'small' ? 400 : 600}
        lineHeight={size === 'small' ? '16px' : '20px'}
        gap={4}
        height="min-content"
        width="min-content"
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

Chip.propTypes = propTypes

export default Chip
