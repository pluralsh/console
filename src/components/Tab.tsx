import { Div, type DivProps, Icon } from 'honorable'
import { type ReactNode } from 'react'
import { useTheme } from 'styled-components'

import Flex, { type FlexProps } from './Flex'
import { type TabBaseProps } from './TabList'

type TabProps = DivProps &
  TabBaseProps & {
    startIcon?: ReactNode
    innerProps?: FlexProps
  }

export const TAB_INDICATOR_THICKNESS = 2

function Tab({
  ref,
  startIcon,
  active,
  activeSecondary,
  children,
  vertical,
  textValue: _textValue,
  innerProps,
  ...props
}: TabProps) {
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
      display="block"
      textDecoration="none"
      tabIndex={0}
      userSelect="none"
      cursor="pointer"
      borderBottom={
        vertical ? null : `1px solid ${active ? 'border-primary' : 'border'}`
      }
      borderRight={
        vertical
          ? `1px solid ${
              active
                ? 'border-primary'
                : activeSecondary
                ? 'border-fill-two'
                : 'border'
            }`
          : null
      }
      {...borderRadiuses}
      _focusVisible={{
        zIndex: theme.zIndexes.base + 1,
        ...theme.partials.focus.default,
      }}
      {...props}
    >
      <Flex
        paddingLeft={theme.spacing.medium}
        paddingRight={theme.spacing.medium}
        paddingTop={theme.spacing.xsmall}
        paddingBottom={theme.spacing.xsmall}
        align="center"
        borderBottom={
          vertical
            ? null
            : `${TAB_INDICATOR_THICKNESS - 1}px solid ${
                active ? theme.colors['border-primary'] : 'transparent'
              }`
        }
        borderRight={
          vertical
            ? `${TAB_INDICATOR_THICKNESS - 1}px solid ${
                active
                  ? theme.colors['border-primary']
                  : activeSecondary
                  ? theme.colors['border-fill-two']
                  : 'transparent'
              }`
            : null
        }
        {...borderRadiuses}
        color={
          active || activeSecondary
            ? theme.colors.text
            : theme.colors['text-xlight']
        }
        backgroundColor={
          !active && activeSecondary ? theme.colors['fill-two'] : 'transparent'
        }
        {...{
          '&:hover': {
            color: theme.colors.text,
            ...(!(!active && activeSecondary)
              ? { backgroundColor: theme.colors['fill-zero-hover'] }
              : {}),
          },
        }}
        transition="background-color 150ms ease, border-color 150ms ease, color 150ms ease"
        {...innerProps}
      >
        {!!startIcon && <Icon marginRight="small">{startIcon}</Icon>}
        {children}
      </Flex>
    </Div>
  )
}

export default Tab
export type { TabProps }
