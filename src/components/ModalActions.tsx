import { Ref, forwardRef } from 'react'
import { Flex, FlexProps } from 'honorable'

type ModalActionsProps = FlexProps

const propTypes = {
}

function ModalActionsRef({ children, ...props }: ModalActionsProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      marginTop="large"
      align="center"
      justify="flex-end"
      {...props}
    >
      {children}
    </Flex>
  )
}

const ModalActions = forwardRef(ModalActionsRef)

ModalActions.propTypes = propTypes

export default ModalActions
