import { ReactNode, Ref, forwardRef } from 'react'
import { DivProps, Flex, Icon } from 'honorable'

type SubTabProps = DivProps & {
  active?: boolean
  startIcon?: ReactNode
  vertical?: boolean
}

const SubTab = forwardRef(
  (
    { startIcon, active, children, ...props }: SubTabProps,
    ref: Ref<any>
  ) => (
    <Flex
      ref={ref}
      buttonMedium
      tabIndex={0}
      userSelect="none"
      cursor="pointer"
      textAlign="center"
      paddingVertical="xsmall"
      paddingHorizontal="medium"
      borderRadius="medium"
      color={active ? 'text' : 'text-xlight'}
      backgroundColor={active ? 'fill-zero-selected' : 'none'}
      _hover={{
        color: 'text',
        backgroundColor: active ? 'fill-zero-selected' : 'action-input-hover',
      }}
      _focusVisible={{ outline: '1px solid border-outline-focused' }}
      {...props}
    >
      {!!startIcon && <Icon marginRight="small">{startIcon}</Icon>}
      {children}
    </Flex>
  )
)

export default SubTab
