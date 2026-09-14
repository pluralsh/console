import { Icon } from 'honorable'
import { type ComponentPropsWithRef, type ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'

import Flex, { type FlexProps } from './Flex'
import { type TabBaseProps } from './TabList'

type TabProps = ComponentPropsWithRef<typeof TabSC> &
  TabBaseProps & {
    startIcon?: ReactNode
    innerProps?: FlexProps
  }

export const TAB_INDICATOR_THICKNESS = 2

const TabSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  display: 'block',
  textDecoration: 'none',
  userSelect: 'none',
  cursor: 'pointer',
  '&:focus-visible': {
    zIndex: theme.zIndexes.base + 1,
    ...theme.partials.focus.default,
  },
}))

function Tab({
  ref,
  startIcon,
  active,
  activeSecondary,
  children,
  vertical,
  textValue: _textValue,
  innerProps,
  css,
  ...props
}: TabProps) {
  const theme = useTheme()

  const borderRadiuses = {
    borderTopLeftRadius: theme.borderRadiuses.medium,
    borderTopRightRadius: vertical ? 0 : theme.borderRadiuses.medium,
    borderBottomLeftRadius: vertical ? theme.borderRadiuses.medium : 0,
  }

  return (
    <TabSC
      ref={ref}
      tabIndex={0}
      css={{
        borderBottom: vertical
          ? undefined
          : `1px solid ${
              active ? theme.colors['border-primary'] : theme.colors.border
            }`,
        borderRight: vertical
          ? `1px solid ${
              active
                ? theme.colors['border-primary']
                : activeSecondary
                  ? theme.colors['border-fill-two']
                  : theme.colors.border
            }`
          : undefined,
        ...borderRadiuses,
        ...css,
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
            ? undefined
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
            : undefined
        }
        {...borderRadiuses}
        color={
          active || activeSecondary
            ? theme.colors.text
            : theme.colors['text-xlight']
        }
        backgroundColor={
          theme.mode === 'light'
            ? active
              ? theme.colors['fill-zero-selected']
              : activeSecondary
                ? theme.colors['fill-zero-hover']
                : 'transparent'
            : !active && activeSecondary
              ? theme.colors['fill-two']
              : 'transparent'
        }
        {...{
          '&:hover': {
            color: theme.colors.text,
            ...(theme.mode === 'light'
              ? { backgroundColor: theme.colors['fill-zero-hover'] }
              : !(!active && activeSecondary)
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
    </TabSC>
  )
}

export default Tab
export type { TabProps }
