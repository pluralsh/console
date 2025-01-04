import { Card, FillLevel, useFillLevel } from '@pluralsh/design-system'
import { Ul } from 'honorable'
import { ReactNode } from 'react'
import styled from 'styled-components'

const fillLevelToBorderColor: Record<FillLevel, string> = {
  0: 'border',
  1: 'border',
  2: 'border-fill-two',
  3: 'border-fill-three',
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

function ListItem({ last, ...props }: ListItemProps) {
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

function List({ children, ...props }: ListProps) {
  return (
    <Card
      display="flex"
      alignItems="top"
      flexDirection="column"
      cornerSize="large"
      margin={0}
      flexGrow={1}
      maxHeight="min-content"
      {...props}
      overflow="hidden"
      as={Ul}
    >
      {children}
    </Card>
  )
}

export { List, ListItem, fillLevelToBorderColor }
