import {
  Flex,
  SubTab,
  toFillLevel,
  useFillLevel,
} from '@pluralsh/design-system'
import { Dispatch, ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import { fillLevelToBackground } from './FillLevelDiv.tsx'
import { fillLevelToBorderColor } from './List.tsx'

import { LinkTabWrap } from './Tabs.tsx'

interface Entry {
  path: string
  icon: ReactNode
  label?: string
}

interface ButtonGroupProps {
  directory: Array<Entry>
  tab: string
  onClick?: Dispatch<string>
  toPath?: (path: string) => string
}

export default function ButtonGroup({
  directory,
  tab,
  onClick,
  toPath,
  ...props
}: ButtonGroupProps) {
  const theme = useTheme()

  return (
    <Flex
      borderRadius={theme.borderRadiuses.medium}
      border={theme.borders.default}
      columnGap={1}
    >
      {toPath ? (
        <ButtonLinkGroup
          directory={directory}
          tab={tab}
          toPath={toPath}
          {...props}
        />
      ) : (
        <ButtonSwitchGroup
          directory={directory}
          tab={tab}
          onClick={onClick}
          {...props}
        />
      )}
    </Flex>
  )
}

function ButtonLinkGroup({ directory, tab, toPath, ...props }): ReactNode {
  const fillLevel = useFillLevel()

  return directory.map(({ path, icon, label }, idx) => (
    <LinkTabWrap
      active={path === tab}
      subTab
      key={path}
      textValue={label}
      to={toPath(path)}
    >
      <SubTabSC
        key={path}
        $tab={tab}
        $label={label}
        $idx={idx}
        $directory={directory}
        $path={path}
        $fillLevel={fillLevel}
        {...props}
      >
        {icon} {label}
      </SubTabSC>
    </LinkTabWrap>
  ))
}

function ButtonSwitchGroup({ directory, tab, onClick, ...props }): ReactNode {
  const fillLevel = useFillLevel()

  return directory.map(({ path, icon, label }, idx) => (
    <SubTabSC
      key={path}
      onClick={() => onClick(path)}
      $tab={tab}
      $label={label}
      $idx={idx}
      $directory={directory}
      $path={path}
      $fillLevel={fillLevel}
      {...props}
    >
      {icon} {label}
    </SubTabSC>
  ))
}

const SubTabSC = styled(SubTab)<{
  $path: string
  $tab: string
  $idx: number
  $label: string
  $directory: Array<Entry>
  $fillLevel: number
}>(({ theme, $path, $tab, $idx, $directory, $label, $fillLevel }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  padding: !$label ? theme.spacing.small : undefined,
  outline:
    $path === $tab
      ? `1px solid ${theme.colors[fillLevelToBorderColor[toFillLevel($fillLevel + 1)]]}`
      : 'none',
  color: $path === $tab ? theme.colors['text'] : theme.colors['text-primary'],
  outlineOffset: 0,
  outlineColor: theme.colors['border-input'],
  backgroundColor:
    $path === $tab
      ? theme.colors[
          `${fillLevelToBackground[toFillLevel($fillLevel)]}-selected`
        ]
      : theme.colors[fillLevelToBackground[toFillLevel($fillLevel)]],
  borderTopLeftRadius: $idx === 0 ? theme.borderRadiuses.medium : 0,
  borderBottomLeftRadius: $idx === 0 ? theme.borderRadiuses.medium : 0,
  borderTopRightRadius:
    $idx === $directory.length - 1 ? theme.borderRadiuses.medium : 0,
  borderBottomRightRadius:
    $idx === $directory.length - 1 ? theme.borderRadiuses.medium : 0,
  height: '100%',
  '&:hover': {
    background:
      theme.colors[fillLevelToBackground[toFillLevel($fillLevel + 1)]],
  },
}))
