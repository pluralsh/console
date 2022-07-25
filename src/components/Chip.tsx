import { ReactElement, Ref, forwardRef } from 'react'
import {
  Flex, FlexProps, P, Spinner,
} from 'honorable'
import PropTypes from 'prop-types'

type ChipProps = FlexProps & {
  size?: 'small' | 'medium' | 'large' | string
  severity?: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'critical' | string
  hue?: 'default' | 'lighter' | 'lightest' | string
  icon?: ReactElement,
  loading?: boolean
}

const propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  severity: PropTypes.oneOf(['neutral', 'info', 'success', 'warning', 'error', 'critical']),
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

const sizeToHeight: { [key in 'small' | 'medium' | 'large']: number } = {
  small: 20,
  medium: 24,
  large: 32,
}

const hueToColor: { [key in 'default' | 'lighter' | 'lightest']: string } = {
  default: 'fill-one',
  lighter: 'fill-two',
  lightest: 'fill-three',
}

const hueToBorderColor: { [key in 'default' | 'lighter' | 'lightest']: string } = {
  default: 'border',
  lighter: 'border-fill-two',
  lightest: 'border-input',
}

function ChipRef({
  children,
  size = 'medium',
  severity = 'neutral',
  hue = 'default',
  loading = false,
  icon,
  ...props
}: ChipProps, ref: Ref<any>) {
  const col = severityToColor[severity] || 'text-light'

  return (
    <Flex
      ref={ref}
      paddingVertical={size === 'large' ? '6px' : 'xxxsmall'}
      paddingHorizontal={size === 'small' ? 'xsmall' : 'small'}
      align="center"
      display="inline-flex"
      backgroundColor={hueToColor[hue]}
      borderRadius="medium"
      border="1px solid border"
      borderColor={hueToBorderColor[hue]}
      maxHeight={sizeToHeight[size]}
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
      <P
        body2
        color={col}
        fontSize={size === 'small' ? 12 : 14}
        fontWeight={size === 'small' ? 400 : 600}
        lineHeight={size === 'small' ? '16px' : '20px'}
        height={size === 'small' ? '16px' : '20px'}
      >
        {children}
      </P>
    </Flex>
  )
}

const Chip = forwardRef(ChipRef)

Chip.propTypes = propTypes

export default Chip
