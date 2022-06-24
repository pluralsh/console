import { Ref, forwardRef } from 'react'
import { Flex, FlexProps, P } from 'honorable'
import PropTypes from 'prop-types'

import CloseIcon from './icons/CloseIcon'

type ModalHeaderProps = FlexProps & {
  title?: string
  onClose?: () => void
}

const propTypes = {
  title: PropTypes.string,
  onClose: PropTypes.func,
}

function ModalHeaderRef({ children, onClose, ...props }: ModalHeaderProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      align="center"
      justify="space-between"
      marginBottom="large"
      {...props}
    >
      <P
        overline
        color="text-xlight"
      >
        {children}
      </P>
      {typeof onClose === 'function' && (
        <Flex
          align="center"
          justify="center"
          padding="xsmall"
          margin={-12}
          borderRadius="medium"
          cursor="pointer"
          _hover={{ backgroundColor: 'fill-two-hover' }}
          onClick={onClose}
        >
          <CloseIcon
            size={14}
            color="text-light"
          />
        </Flex>
      )}
    </Flex>
  )
}

const ModalHeader = forwardRef(ModalHeaderRef)

ModalHeader.propTypes = propTypes

export default ModalHeader
