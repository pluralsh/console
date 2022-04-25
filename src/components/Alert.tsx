import { PropsWithChildren } from 'react'
import { Div, Icon, P, useTheme } from 'honorable'
import PropTypes from 'prop-types'

import StatusIpIcon from './icons/StatusIpIcon'
import StatusOkIcon from './icons/StatusOkIcon'
import ErrorIcon from './icons/ErrorIcon'
import CloseIcon from './icons/CloseIcon'

type AlertProps = typeof Div & PropsWithChildren<{
  severity?: 'success' | 'warning' | 'error' | 'info'
  title?: string
  onClose?: () => void
}>

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
  success: 'transparencify(success, 60)',
  warning: 'transparencify(warning, 60)',
  error: 'transparencify(error, 60)',
  info: 'background-light',
}

const severityToIcon = {
  success: StatusIpIcon,
  warning: StatusOkIcon,
  error: ErrorIcon,
  info: StatusOkIcon,
}

function Alert({ children, severity = 'info', title = '', onClose, ...props }: AlertProps) {
  const theme = useTheme()
  const AlertIcon = severityToIcon[severity] || StatusOkIcon
  const color = severityToColor[severity] || 'primary'

  return (
    <Div
      position="relative"
      py={1}
      px={2}
      backgroundColor={severityToBackgroundColor[severity]}
      borderRadius={4}
      xflex="x4"
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
            color={theme.utils.resolveColor('text') as string}
            size={12}
          />
        </Div>
      )}
      <Icon
        flexShrink={0}
        color={color}
      >
        <AlertIcon
          size={24}
          color={theme.utils.resolveColor(color) as string}
        />
      </Icon>
      <Div ml={2}>
        {!!title && (
          <P
            fontWeight="bold"
            mb={children ? 1 : 0}
          >
            {title}
          </P>
        )}
        <P>
          {children}
        </P>
      </Div>
    </Div>
  )
}

Alert.propTypes = propTypes

export default Alert
