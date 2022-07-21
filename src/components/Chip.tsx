import { ReactElement, Ref, forwardRef } from 'react'
import { Flex, FlexProps, P, Spinner } from 'honorable'
import PropTypes from 'prop-types'

type ChipProps = FlexProps & {
  size?: 'small' | 'medium' | 'large' | string
  severity?: 'neutral' | 'info' | 'success' | 'warning' | 'error' | string
  icon?: ReactElement,
  loading?: boolean
}

const propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  severity: PropTypes.oneOf(['neutral', 'info', 'success', 'warning', 'error']),
  icon: PropTypes.element,
  loading: PropTypes.bool,
}

const severityToColor = {
  neutral: 'text-light',
  info: 'text-primary-accent',
  success: 'text-success-light',
  warning: 'text-warning-light',
  error: 'text-error-light',
}

function ChipRef({
  children,
  size = 'medium',
  severity = 'neutral',
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
      backgroundColor="fill-one"
      borderRadius="medium"
      border="1px solid border"
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
      >
        {children}
      </P>
    </Flex>
  )
}

const Chip = forwardRef(ChipRef)

Chip.propTypes = propTypes

export default Chip
