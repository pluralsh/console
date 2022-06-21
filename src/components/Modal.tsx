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
      {...props}
    >
      <Flex
        align="center"
        justify="space-between"
        padding="medium"
      >
        <P
          overline
          color="text-xlight"
        >
          {title}
        </P>
        {typeof onClose === 'function' && (
          <CloseIcon
            size={24}
            color="text-light"
            onClick={onClose}
          />
        )}
      </Flex>
      {children}
    </HonorableModal>
  )
}

const Modal = forwardRef(ModalRef)

Modal.propTypes = propTypes

export default Modal
