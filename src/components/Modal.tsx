import { Ref, forwardRef } from 'react'
import { Flex, Modal as HonorableModal, ModalProps as HonorableModalProps, P } from 'honorable'
import PropTypes from 'prop-types'

import CloseIcon from './icons/CloseIcon'

type ModalProps = HonorableModalProps & {
  title?: string
}

const propTypes = {
  title: PropTypes.string,
}

function ModalRef({ children, title, onClose, ...props }: ModalProps, ref: Ref<any>) {
  return (
    <HonorableModal
      ref={ref}
      onClose={onClose}
      padding="large"
      minWidth={512}
      maxWidth={1024}
      {...props}
    >
      <Flex
        align="center"
        justify="space-between"
        marginBottom="large"
      >
        <P
          overline
          color="text-xlight"
        >
          {title}
        </P>
        {typeof onClose === 'function' && (
          <Flex
            align="center"
            justify="center"
            padding="small"
            margin={-12}
            borderRadius="50%"
            cursor="pointer"
            _hover={{ backgroundColor: 'fill-two-hover' }}
          >
            <CloseIcon
              size={14}
              color="text-light"
              onClick={onClose}
            />
          </Flex>
        )}
      </Flex>
      {children}
    </HonorableModal>
  )
}

const Modal = forwardRef(ModalRef)

Modal.propTypes = propTypes

export default Modal
