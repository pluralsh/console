import { Ref, forwardRef } from 'react'
import { Flex, FlexProps, P, Spinner } from 'honorable'
import PropTypes from 'prop-types'

type ChipProps = FlexProps & {
  size?: 'medium' | 'large' | string
  severity?: 'neutral' | 'info' | 'success' | 'warning' | 'error' | string
  loading?: boolean
}

const propTypes = {
  size: PropTypes.oneOf(['medium', 'large']),
  severity: PropTypes.oneOf(['neutral', 'info', 'success', 'warning', 'error']),
  loading: PropTypes.bool,
}

const severityToColor = {
  neutral: 'text-light',
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

function ChipRef({
  children,
  size = 'medium',
  severity = 'neutral',
  loading = false,
  ...props
}: ChipProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      paddingVertical={size === 'large' ? 'xsmall' : 'xxxsmall'}
      paddingHorizontal="small"
      align="center"
      display="inline-flex"
      backgroundColor="fill-one"
      borderRadius="medium"
      border="1px solid border"
      {...props}
    >
      {loading && (
        <Spinner
          color={severityToColor[severity] || 'text-light'}
          size={size === 'large' ? 15 : 13}
          marginRight="xsmall"
        />
      )}
      <P
        body2
        color={severityToColor[severity] || 'text-light'}
      >
        {children}
      </P>
    </Flex>
  )
}

const Chip = forwardRef(ChipRef)

Chip.propTypes = propTypes

export default Chip
