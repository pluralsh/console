import { FlexProps, Modal } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

type ModalProps = FlexProps & {
  form?: boolean
}

const propTypes = {
  form: PropTypes.bool,
}

function ModalRef({
  children,
  form = false,
  open = false,
  onClose,
  ...props
}: ModalProps,
ref: Ref<any>) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      form={form}
      ref={ref}
      fontSize={16}
      color="text"
      {...props}
    >{children}
    </Modal>
  )
}

const ModalProps = forwardRef(ModalRef)

ModalProps.propTypes = propTypes

export default ModalProps
