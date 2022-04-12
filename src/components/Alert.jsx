import PropTypes from 'prop-types'
import { Box, Text } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'

import StatusIpIcon from './icons/StatusIpIcon'
import StatusOkIcon from './icons/StatusOkIcon'
import ErrorIcon from './icons/ErrorIcon'
import CloseIcon from './icons/CloseIcon'

const severityToBackgroundColor = {
  success: 'status-ok-dark',
  warning: 'status-warning-dark',
  error: 'status-critical-dark',
  info: 'background-light',
}

const severityToIcon = {
  success: StatusIpIcon,
  warning: StatusOkIcon,
  error: ErrorIcon,
  info: StatusOkIcon,
}

const severityToColor = {
  success: 'status-ok',
  warning: 'status-warning',
  error: 'status-critical',
  info: 'brand',
}

const Container = styled(Box)`
  position: relative;
  padding: 16px 24px;
  border-radius: 4px;
  background-color: ${({ theme, severity }) => normalizeColor(severityToBackgroundColor[severity] || 'background-light', theme)};
`

const CloseContainer = styled(Box)`
  position: absolute;
  top: 16px;
  right: 16px;
  cursor: pointer;
`

function Alert({ severity, children, title, onClose, ...props }) {
  const Icon = severityToIcon[severity] || StatusOkIcon
  const color = severityToColor[severity] || 'brand'

  return (
    <Container
      severity={severity}
      direction="row"
      align="center"
    >
      {typeof onClose === 'function' && (
        <CloseContainer onClick={onClose}>
          <CloseIcon
            color="white"
            size={12}
          />
        </CloseContainer>
      )}
      <Icon
        size={24}
        color={color}
      />
      <Box margin={{ left: '24px' }}>
        {!!title && (
          <Text
            weight="bold"
            margin={{ bottom: children ? '16px' : '0' }}
          >
            {title}
          </Text>
        )}
        <Text>
          {children}
        </Text>
      </Box>
    </Container>
  )
}

Alert.propTypes = {
  severity: PropTypes.oneOf(['success', 'warning', 'error', 'info']),
  title: PropTypes.string,
  onClose: PropTypes.func,
}

Alert.defaultProps = {
  severity: 'info',
  title: '',
  onClose: null,
}

export default Alert
