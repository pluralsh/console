import { Ref, forwardRef } from 'react'
import { Div, Flex, FlexProps } from 'honorable'
import PropTypes from 'prop-types'

import StatusOkIcon from './icons/StatusOkIcon'
import ErrorIcon from './icons/ErrorIcon'
import CloseIcon from './icons/CloseIcon'

type BannerProps = FlexProps & {
  severity?: 'success' | 'error' | string
  onClose?: () => void
}

const propTypes = {
  severity: PropTypes.oneOf(['success', 'error']),
  onClose: PropTypes.func,
}

const severityToColor = {
  success: 'icon-success',
  error: 'icon-error',
}

const severityToIcon = {
  success: StatusOkIcon,
  error: ErrorIcon,
}

function BannerRef({ children, severity = 'success', onClose, ...props }: BannerProps, ref: Ref<any>) {
  const BannerIcon = severityToIcon[severity] || severityToIcon.success
  const color = severityToColor[severity] || severityToColor.success

  function handleClose() {
    if (typeof onClose === 'function') {
      onClose()
    }
  }

  return (
    <Flex
      ref={ref}
      display="inline-flex"
      align="flex-start"
      paddingTop="medium"
      paddingBottom="small"
      paddingHorizontal="medium"
      backgroundColor="fill-two"
      borderRadius="medium"
      borderTop={`4px solid ${color}`}
      {...props}
    >
      <BannerIcon
        size={24}
        color={color}
        marginRight="medium"
      />
      <Div marginTop="xxsmall">
        {children}
      </Div>
      <Flex
        align="center"
        justify="center"
        padding="xsmall"
        marginTop="minus-xxsmall"
        marginLeft="medium"
        borderRadius="50%"
        cursor="pointer"
        _hover={{ backgroundColor: 'fill-two-hover' }}
        onClick={handleClose}
      >
        <CloseIcon />
      </Flex>
    </Flex>
  )
}

const Banner = forwardRef(BannerRef)

Banner.propTypes = propTypes

export default Banner
