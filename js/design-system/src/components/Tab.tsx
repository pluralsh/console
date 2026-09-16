import { type ReactNode } from 'react'
import { useTheme } from 'styled-components'

import Flex, { type FlexProps } from './Flex'
import Icon from './Icon'
import { type TabBaseProps } from './TabList'

export type TabProps = FlexProps &
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
  css,
  ...props
}: TabProps) {
  const theme = useTheme()
  const indicatorColor = active
    ? theme.colors['border-primary']
    : activeSecondary
      ? theme.colors['border-fill-two']
      : 'transparent'
  const borderRadiuses = {
    borderTopLeftRadius: theme.borderRadiuses.medium,
    borderTopRightRadius: vertical ? 0 : theme.borderRadiuses.medium,
    borderBottomLeftRadius: vertical ? theme.borderRadiuses.medium : 0,
  }

  return (
    <Flex
      ref={ref}
      display="block"
      width={vertical ? '100%' : undefined}
      tabIndex={0}
      userSelect="none"
      cursor="pointer"
      textDecoration="none"
      color={
        active || activeSecondary
          ? theme.colors.text
          : theme.colors['text-xlight']
      }
      borderBottom={
        vertical
          ? undefined
          : `1px solid ${
              active ? theme.colors['border-primary'] : theme.colors.border
            }`
      }
      borderRight={
        vertical
          ? `1px solid ${
              active
                ? theme.colors['border-primary']
                : activeSecondary
                  ? theme.colors['border-fill-two']
                  : theme.colors.border
            }`
          : undefined
      }
      {...borderRadiuses}
      // Pass css directly to Flex: a generated styled wrapper would consume `as`
      // and bypass Flex's conversion of style props when rendering a link.
      {...{
        css: {
          ...theme.partials.text.body2,
          '&:hover': { color: theme.colors.text },
          '&:focus-visible': {
            zIndex: theme.zIndexes.base + 1,
            ...theme.partials.focus.default,
          },
          ...css,
        },
      }}
      {...props}
    >
      <Flex
        paddingLeft={theme.spacing.medium}
        paddingRight={theme.spacing.medium}
        paddingTop={theme.spacing.xsmall}
        paddingBottom={theme.spacing.xsmall}
        align="center"
        width={vertical ? '100%' : undefined}
        borderBottom={
          vertical
            ? undefined
            : `${TAB_INDICATOR_THICKNESS - 1}px solid ${
                active ? theme.colors['border-primary'] : 'transparent'
              }`
        }
        borderRight={
          vertical
            ? `${TAB_INDICATOR_THICKNESS - 1}px solid ${indicatorColor}`
            : undefined
        }
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
        transition="background-color 150ms ease, border-color 150ms ease, color 150ms ease"
        {...borderRadiuses}
        {...innerProps}
        css={{
          boxSizing: 'border-box',
          '&:hover': {
            color: theme.colors.text,
            ...(theme.mode === 'light'
              ? { backgroundColor: theme.colors['fill-zero-hover'] }
              : !(!active && activeSecondary)
                ? { backgroundColor: theme.colors['fill-zero-hover'] }
                : {}),
          },
          ...innerProps?.css,
        }}
      >
        {!!startIcon && <Icon marginRight="small">{startIcon}</Icon>}
        {children}
      </Flex>
    </Flex>
  )
}

export default Tab
