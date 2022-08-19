import { ReactNode, Ref, forwardRef } from 'react'
import { DivProps, Flex, Icon } from 'honorable'
import { useTheme } from 'styled-components'

import { TabBaseProps } from './TabList'

type SubTabProps = TabBaseProps & DivProps & {
  startIcon?: ReactNode
}

const SubTab = forwardRef(({
  startIcon, active, children, ...props
}: SubTabProps, ref: Ref<any>) => {
  const theme = useTheme()

  return (
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
      _focusVisible={{
        ...theme.partials.focus.default,
        zIndex: theme.zIndexes.base + 1,
      }}
      {...props}
    >
      {!!startIcon && <Icon marginRight="small">{startIcon}</Icon>}
      {children}
    </Flex>
  )
})

export default SubTab
