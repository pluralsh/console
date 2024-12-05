import { Flex, SubTab } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'

import { LinkTabWrap } from './Tabs.tsx'

interface Entry {
  path: string
  icon: ReactNode
  label?: string
}

interface ButtonGroupProps {
  directory: Array<Entry>
  toPath: (path: string) => string
  tab: string
}

export default function ButtonGroup({
  directory,
  toPath,
  tab,
}: ButtonGroupProps) {
  const theme = useTheme()

  return (
    <Flex
      borderRadius={theme.borderRadiuses.medium}
      border={theme.borders.default}
      columnGap={1}
    >
      {directory.map(({ path, icon, label }, idx) => (
        <LinkTabWrap
          active={path === tab}
          subTab
          key={path}
          textValue={label}
          to={toPath(path)}
        >
          <SubTab
            key={path}
            css={{
              display: 'flex',
              gap: theme.spacing.small,
              padding: !label ? theme.spacing.small : undefined,
              outline: path === tab ? undefined : 'none',
              outlineOffset: 0,
              outlineColor: theme.colors['border-input'],
              borderTopLeftRadius: idx === 0 ? theme.borderRadiuses.medium : 0,
              borderBottomLeftRadius:
                idx === 0 ? theme.borderRadiuses.medium : 0,
              borderTopRightRadius:
                idx === directory.length - 1 ? theme.borderRadiuses.medium : 0,
              borderBottomRightRadius:
                idx === directory.length - 1 ? theme.borderRadiuses.medium : 0,
              height: '100%',
              '&:hover': { background: theme.colors['fill-zero-hover'] },
            }}
          >
            {icon} {label}
          </SubTab>
        </LinkTabWrap>
      ))}
    </Flex>
  )
}
