import {
  FillLevel,
  Flex,
  SubTab,
  toFillLevel,
  Tooltip,
  useFillLevel,
  WrapWithIf,
} from '@pluralsh/design-system'
import { ComponentPropsWithRef, Dispatch, ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import { fillLevelToBackground } from './FillLevelDiv.tsx'
import { fillLevelToBorderColor } from './List.tsx'

import { LinkTabWrap } from './Tabs.tsx'

type Entry = {
  path: string
  icon?: ReactNode
  label?: string
}

type ButtonGroupProps = {
  directory: Array<Entry>
  tab: string
  onClick?: Dispatch<string>
  toPath?: (path: string) => string
  fillLevel?: FillLevel
} & ComponentPropsWithRef<typeof SubTab>

export default function ButtonGroup({
  directory,
  tab,
  onClick,
  toPath,
  fillLevel,
  ...props
}: ButtonGroupProps) {
  const theme = useTheme()
  const inferredFillLevel = useFillLevel()

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
          fillLevel={fillLevel}
          {...props}
        />
      ) : (
        <ButtonSwitchGroup
          directory={directory}
          tab={tab}
          onClick={onClick}
          fillLevel={fillLevel ?? inferredFillLevel}
          {...props}
        />
      )}
    </Flex>
  )
}

function ButtonLinkGroup({ directory, tab, toPath, fillLevel, ...props }) {
  return directory.map(({ path, icon, label, tooltip }, idx) => (
    <WrapWithIf
      key={path}
      condition={!!tooltip}
      wrapper={
        <Tooltip
          key={path}
          label={tooltip}
          placement="top"
        />
      }
    >
      <LinkTabWrap
        active={path === tab}
        subTab
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
    </WrapWithIf>
  ))
}

function ButtonSwitchGroup({ directory, tab, onClick, fillLevel, ...props }) {
  return directory.map(({ path, icon, label, tooltip }, idx) => (
    <WrapWithIf
      key={path}
      condition={!!tooltip}
      wrapper={
        <Tooltip
          label={tooltip}
          placement="top"
        />
      }
    >
      <SubTabSC
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
    </WrapWithIf>
  ))
}

const SubTabSC = styled(SubTab)<{
  $path: string
  $tab: string
  $idx: number
  $label: string
  $directory: Array<Entry>
  $fillLevel: number
}>(({ theme, $path, $tab, $idx, $directory, $label, $fillLevel }) => {
  const border = `1px solid ${theme.colors[fillLevelToBorderColor[toFillLevel($fillLevel + 1)]]}`
  const bgColorName = fillLevelToBackground[toFillLevel($fillLevel)]
  return {
    display: 'flex',
    gap: theme.spacing.small,
    padding: !$label ? theme.spacing.small : undefined,
    outline: $path === $tab ? border : 'none',
    color: $path === $tab ? theme.colors['text'] : theme.colors['text-primary'],
    borderRight: $idx === $directory.length - 1 ? 'none' : border,
    outlineOffset: 0,
    outlineColor: theme.colors['border-input'],
    backgroundColor:
      theme.colors[$path === $tab ? `${bgColorName}-selected` : bgColorName],
    borderTopLeftRadius: $idx === 0 ? theme.borderRadiuses.medium : 0,
    borderBottomLeftRadius: $idx === 0 ? theme.borderRadiuses.medium : 0,
    borderTopRightRadius:
      $idx === $directory.length - 1 ? theme.borderRadiuses.medium : 0,
    borderBottomRightRadius:
      $idx === $directory.length - 1 ? theme.borderRadiuses.medium : 0,
    height: '100%',
    '&:hover, &:focus-visible': {
      background:
        theme.colors[fillLevelToBackground[toFillLevel($fillLevel + 1)]],
    },
    '&:focus-visible': {
      outline: `1px solid ${theme.colors['border-outline-focused']}`,
    },
  }
})
