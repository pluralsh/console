import { ReactNode, Ref, forwardRef } from 'react'
import {
  Div,
  DivProps,
  Flex,
  Icon,
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

  const borderRadiuses = {
    borderTopLeftRadius: theme.borderRadiuses.medium,
    borderTopRightRadius: vertical ? 0 : theme.borderRadiuses.medium,
    borderBottomLeftRadius: vertical ? theme.borderRadiuses.medium : 0,
  }

  return (
    <Div
      ref={ref}
      body2
      tabIndex={0}
      userSelect="none"
      cursor="pointer"
      borderBottom={
        vertical ? null : `1px solid ${active ? 'border-primary' : 'border'}`
      }
      borderRight={
        vertical ? `1px solid ${active ? 'border-primary' : 'border'}` : null
      }
      {...borderRadiuses}
      _focusVisible={{
        zIndex: theme.zIndexes.base + 1,
        ...theme.partials.focus.default,
      }}
      {...props}
    >
      <Flex
        paddingHorizontal="medium"
        paddingTop="xsmall"
        paddingBottom={theme.spacing.xsmall - 3}
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
        {...borderRadiuses}
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
