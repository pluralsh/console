import { ReactNode, Ref, forwardRef } from 'react'
import {
  Div, DivProps, Flex, Icon,
} from 'honorable'
import { useTheme } from 'styled-components'

import { TabBaseProps } from './TabList'

type TabProps = DivProps & TabBaseProps & {
  startIcon?: ReactNode
}

function TabRef({
  startIcon,
  active,
  children,
  vertical,
  textValue: _textValue,
  ...props
}: TabProps,
ref: Ref<any>) {
  const theme = useTheme()

  return (
    <Div
      ref={ref}
      buttonMedium
      tabIndex={0}
      userSelect="none"
      cursor="pointer"
      borderBottom={
        vertical ? null : `1px solid ${active ? 'border-primary' : 'border'}`
      }
      borderRight={
        vertical ? `1px solid ${active ? 'border-primary' : 'border'}` : null
      }
      _focusVisible={{
        zIndex: theme.zIndexes.base + 1,
        ...theme.partials.focus.default,
      }}
      {...props}
    >
      <Flex
        paddingHorizontal="medium"
        paddingTop={vertical ? 'xsmall' : 'medium'}
        paddingBottom="xsmall"
        align="center"
        borderBottom={
          vertical
            ? null
            : `3px solid ${active ? 'border-primary' : 'transparent'}`
        }
        borderRight={
          vertical
            ? `3px solid ${active ? 'border-primary' : 'transparent'}`
            : null
        }
        color={active ? 'text' : 'text-xlight'}
        _hover={{
          color: 'text',
          backgroundColor: 'action-input-hover',
        }}
        transition="background-color 150ms ease, border-color 150ms ease, color 150ms ease"
      >
        {!!startIcon && <Icon marginRight="small">{startIcon}</Icon>}
        {children}
      </Flex>
    </Div>
  )
}

const Tab = forwardRef(TabRef)

export default Tab
export { TabProps }
