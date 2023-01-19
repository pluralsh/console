import { ReactNode, Ref, forwardRef } from 'react'
import {
  Div,
  Flex,
  Modal as HonorableModal,
  ModalProps,
  P,
} from 'honorable'
import PropTypes from 'prop-types'

type ModalPropsType = ModalProps & {
  form?: boolean
  size?: 'medium' | 'large' | string
  header?: ReactNode
  actions?: ReactNode
}

const propTypes = {
  form: PropTypes.bool,
  size: PropTypes.oneOf(['medium', 'large']),
  header: PropTypes.node,
  actions: PropTypes.node,
}

const sizeToWidth: { [key in 'medium' | 'large']: number } = {
  medium: 480,
  large: 608,
}

function ModalRef({
  children,
  header,
  actions,
  form = false,
  open = false,
  size = form ? 'large' : 'medium',
  onClose,
  ...props
}: ModalPropsType,
ref: Ref<any>) {
  return (
    <HonorableModal
      open={open}
      onClose={onClose}
      ref={ref}
      fontSize={16}
      color="text"
      width={sizeToWidth[size]}
      maxWidth={sizeToWidth[size]}
      {...props}
    >
      <Div
        margin="large"
        marginBottom={actions ? 0 : 'large'}
      >
        {!!header && (
          <Flex
            ref={ref}
            align="center"
            justify="space-between"
            marginBottom="large"
          >
            <P
              overline
              color="text-xlight"
            >
              {header}
            </P>
          </Flex>
        )}
        {children}
      </Div>
      {!!actions && (
        <Flex
          position="sticky"
          direction="column"
          bottom="0"
        >
          <Flex
            background="linear-gradient(180deg, transparent 0%, fill-one 100%);"
            height={16}
          />
          <Flex
            padding="large"
            align="center"
            justify="flex-end"
            backgroundColor="fill-one"
          >
            {actions}
          </Flex>
        </Flex>
      )}
    </HonorableModal>
  )
}

const Modal = forwardRef(ModalRef)

Modal.propTypes = propTypes

export default Modal
