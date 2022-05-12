import { Ref, forwardRef } from 'react'
import { Div, DivProps, Flex, P } from 'honorable'
import PropTypes from 'prop-types'

import StatusIpIcon from './icons/StatusIpIcon'
import StatusOkIcon from './icons/StatusOkIcon'
import ErrorIcon from './icons/ErrorIcon'
import CloseIcon from './icons/CloseIcon'

type AlertProps = DivProps & {
  severity?: 'success' | 'warning' | 'error' | 'info' | string
  title?: string
  onClose?: () => void
}

const propTypes = {
  children: PropTypes.node,
  severity: PropTypes.oneOf(['success', 'warning', 'error', 'info']),
  title: PropTypes.string,
  onClose: PropTypes.func,
}

const severityToColor = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'primary',
}

const severityToBackgroundColor = {
  success: 'background-success',
  warning: 'background-warning',
  error: 'background-error',
  info: 'background-info',
}

const severityToIcon = {
  success: StatusIpIcon,
  warning: StatusOkIcon,
  error: ErrorIcon,
  info: StatusOkIcon,
}

function AlertRef({ children, severity = 'info', title = '', onClose, ...props }: AlertProps, ref: Ref<any>) {
  const AlertIcon = severityToIcon[severity] || StatusOkIcon
  const color = severityToColor[severity] || 'primary'

  return (
    <Flex
      ref={ref}
      align="center"
      position="relative"
      py={1}
      px={2}
      backgroundColor={severityToBackgroundColor[severity]}
      borderRadius={4}
      {...props}
    >
      {typeof onClose === 'function' && (
        <Div
          onClick={onClose}
          position="absolute"
          top={16}
          right={16}
          cursor="pointer"
        >
          <CloseIcon
            color="text"
            size={12}
          />
        </Div>
      )}
      <AlertIcon
        size={24}
        color={color}
        flexShrink={0}

      />
      <Div ml={2}>
        {!!title && (
          <P
            body1
            fontWeight="bold"
            mb={children ? 1 : 0}
          >
            {title}
          </P>
        )}
        <P body2>
          {children}
        </P>
      </Div>
    </Flex>
  )
}

const Alert = forwardRef(AlertRef)

Alert.propTypes = propTypes

export default Alert
