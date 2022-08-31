import { FlexProps, Modal } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

type ModalProps = FlexProps & {
  form?: boolean
  size?: 'medium' | 'large' | string
}

const propTypes = {
  form: PropTypes.bool,
  size: PropTypes.oneOf(['medium', 'large']),
}

const sizeToWidth: { [key in 'medium' | 'large']: number } = {
  medium: 480,
  large: 608,
}

function ModalRef({
  children,
  form = false,
  open = false,
  size = form ? 'large' : 'medium',
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
      width={sizeToWidth[size]}
      maxWidth={sizeToWidth[size]}
      {...props}
    >
      {children}
    </Modal>
  )
}

const ModalProps = forwardRef(ModalRef)

ModalProps.propTypes = propTypes

export default ModalProps
