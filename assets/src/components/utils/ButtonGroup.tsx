import { SubTab, TabList } from '@pluralsh/design-system'
import { ReactNode, useCallback, useRef } from 'react'
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
}: ButtonGroupProps): ReactNode {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const currentTab = directory.find(({ path }) => path === tab)
  const radius = theme.borderRadiuses.medium

  const first = useCallback((idx: number) => idx === 0, [])
  const last = useCallback(
    (idx: number) => !first(idx) && idx === directory.length - 1,
    [directory.length, first]
  )
  const middle = useCallback(
    (idx: number) => !first(idx) && !last(idx),
    [first, last]
  )

  return (
    <TabList
      margin={1}
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'horizontal',
        selectedKey: currentTab?.path,
      }}
    >
      {directory.map(({ path, icon, label }, idx) => (
        <LinkTabWrap
          subTab
          key={path}
          textValue={label}
          css={{
            width: label ? 'auto' : 40,
            height: label ? 'auto' : 40,
            border: theme.borders.default,
            borderColor:
              path === tab
                ? theme.colors['border-selected']
                : theme.colors['border'],
            borderTopRightRadius: first(idx) || middle(idx) ? 0 : radius,
            borderBottomRightRadius: first(idx) || middle(idx) ? 0 : radius,
            borderTopLeftRadius: last(idx) || middle(idx) ? 0 : radius,
            borderBottomLeftRadius: last(idx) || middle(idx) ? 0 : radius,
          }}
          to={toPath(path)}
        >
          <SubTab
            key={path}
            css={{
              alignItems: 'center',
              display: 'flex',
              gap: theme.spacing.small,
              outline: 'none',
              borderTopRightRadius: first(idx) || middle(idx) ? 0 : radius,
              borderBottomRightRadius: first(idx) || middle(idx) ? 0 : radius,
              borderTopLeftRadius: last(idx) || middle(idx) ? 0 : radius,
              borderBottomLeftRadius: last(idx) || middle(idx) ? 0 : radius,
              ...(!label
                ? {
                    justifyContent: 'center',
                    display: 'inline-flex',
                    width: '100%',
                    height: '100%',
                    padding: 0,
                    outline: 'none',
                  }
                : {}),
            }}
          >
            {icon} {label}
          </SubTab>
        </LinkTabWrap>
      ))}
    </TabList>
  )
}
