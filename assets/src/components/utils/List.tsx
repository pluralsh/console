import {
  Card,
  FillLevel,
  SemanticBorderKey,
  SemanticColorKey,
  useFillLevel,
} from '@pluralsh/design-system'

import { ReactNode } from 'react'
import styled from 'styled-components'

export const fillLevelToBorderColor: Record<FillLevel, SemanticColorKey> = {
  0: 'border',
  1: 'border-fill-one',
  2: 'border-fill-two',
  3: 'border-fill-three',
}

export const fillLevelToBorder: Record<FillLevel, SemanticBorderKey> = {
  0: 'default',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
}

const ListItemSC = styled.li<{
  $last?: boolean
  $fillLevel?: FillLevel
}>(({ theme, $last = false, $fillLevel }) => ({
  margin: 0,
  textIndent: 0,
  listStyle: 'none',
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  borderBottomStyle: $last ? 'none' : 'solid',
  borderColor:
    theme.colors[fillLevelToBorderColor[$fillLevel ?? 1]] || 'transparent',
  borderWidth: '1px',
}))

type ListItemProps = any & {
  last: boolean
  children: ReactNode
}

export function ListItem({ last, ...props }: ListItemProps) {
  const fillLevel = useFillLevel()

  return (
    <ListItemSC
      $fillLevel={fillLevel}
      $last={last}
      {...props}
    />
  )
}

type ListProps = any & {
  children: ReactNode
}

export function List({ children, ...props }: ListProps) {
  return (
    <ul css={{ display: 'contents' }}>
      <Card
        display="flex"
        alignItems="top"
        flexDirection="column"
        cornerSize="large"
        margin={0}
        flexGrow={1}
        {...props}
        overflow="hidden"
      >
        {children}
      </Card>
    </ul>
  )
}
