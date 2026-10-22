import {
  FillLevel,
  ICON_FRAME_ICON_SIZE,
  SemanticBorderKey,
  SubTab,
  toFillLevel,
  Tooltip,
  useFillLevel,
  WrapWithIf,
} from '@pluralsh/design-system'
import {
  cloneElement,
  ComponentPropsWithRef,
  Dispatch,
  isValidElement,
  ReactElement,
  ReactNode,
} from 'react'
import styled from 'styled-components'
import { fillLevelToBackground } from './FillLevelDiv.tsx'

import { LinkTabWrap } from './Tabs.tsx'

type DirectoryEntry = {
  path: string
  icon?: ReactNode
  label?: string
}

export type ButtonGroupDirectory = DirectoryEntry[]

type ButtonGroupProps = {
  directory: ButtonGroupDirectory
  tab: string
  onClick?: Dispatch<string>
  toPath?: (path: string) => string
  fillLevel?: FillLevel
  iconSize?: number
} & ComponentPropsWithRef<typeof SubTab>

export function ButtonGroup({
  directory,
  tab,
  onClick,
  toPath,
  fillLevel: fillLevelProp,
  iconSize,
  ...props
}: ButtonGroupProps) {
  const inferredFillLevel = useFillLevel()
  const fillLevel = fillLevelProp ?? inferredFillLevel

  return (
    <GroupWrapperSC $fillLevel={fillLevel}>
      {toPath ? (
        <ButtonLinkGroup
          directory={directory}
          tab={tab}
          toPath={toPath}
          fillLevel={fillLevel}
          iconSize={iconSize}
          {...props}
        />
      ) : (
        <ButtonSwitchGroup
          directory={directory}
          tab={tab}
          onClick={onClick}
          fillLevel={fillLevel}
          iconSize={iconSize}
          {...props}
        />
      )}
    </GroupWrapperSC>
  )
}

function ButtonLinkGroup({
  directory,
  tab,
  toPath,
  fillLevel,
  iconSize,
  ...props
}) {
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
        textValue={label}
        to={toPath(path)}
        style={{ zIndex: path === tab ? 1 : 0 }}
      >
        <SubTabSC
          key={path}
          $active={path === tab}
          $label={label}
          $idx={idx}
          $directory={directory}
          $fillLevel={fillLevel}
          {...props}
        >
          <ButtonGroupIcon
            icon={icon}
            size={iconSize}
          />{' '}
          {label}
        </SubTabSC>
      </LinkTabWrap>
    </WrapWithIf>
  ))
}

function ButtonSwitchGroup({
  directory,
  tab,
  onClick,
  fillLevel,
  iconSize,
  ...props
}) {
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
        $active={path === tab}
        $label={label}
        $idx={idx}
        $directory={directory}
        $fillLevel={fillLevel}
        {...props}
      >
        <ButtonGroupIcon
          icon={icon}
          size={iconSize}
        />{' '}
        {label}
      </SubTabSC>
    </WrapWithIf>
  ))
}

function ButtonGroupIcon({ icon, size }: { icon?: ReactNode; size?: number }) {
  if (!icon || !size || !isValidElement(icon)) return icon

  return (
    <span
      css={{
        display: 'flex',
        width: ICON_FRAME_ICON_SIZE.medium,
        height: ICON_FRAME_ICON_SIZE.medium,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {cloneElement(icon as ReactElement<{ size?: number }>, { size })}
    </span>
  )
}

const GroupWrapperSC = styled.div<{
  $fillLevel: number
}>(({ theme, $fillLevel }) => ({
  display: 'flex',
  justifyContent: 'center',
  backgroundColor:
    $fillLevel === 0
      ? 'transparent'
      : theme.colors[fillLevelToBackground[toFillLevel($fillLevel)]],
  border: theme.borders[fillLevelToBorder[toFillLevel($fillLevel)]],
  borderRadius: theme.borderRadiuses.medium,
}))

const SubTabSC = styled(SubTab)<{
  $active: boolean
  $idx: number
  $label: string
  $directory: ButtonGroupDirectory
  $fillLevel: number
}>(({ theme, $active, $idx, $directory, $label, $fillLevel, size }) => {
  return {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.small,
    padding: !$label
      ? size === 'small'
        ? theme.spacing.xsmall - 2
        : theme.spacing.small
      : undefined,
    color: $active ? theme.colors['text'] : theme.colors['text-primary'],
    borderRight:
      $idx === $directory.length - 1 || $active
        ? 'none'
        : theme.borders[fillLevelToBorder[toFillLevel($fillLevel)]],
    zIndex: $active ? 1 : 0,
    outline: $active ? theme.borders.input : 'none',
    outlineOffset: 0,
    backgroundColor: $active
      ? theme.colors[
          fillLevelToBackground[toFillLevel($fillLevel)] + '-selected'
        ]
      : 'transparent',
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
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
  }
})

export const fillLevelToBorder: Record<FillLevel, SemanticBorderKey> = {
  0: 'default',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
}
