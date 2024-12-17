import { Card, FillLevel, useFillLevel } from '@pluralsh/design-system'
import { Ul } from 'honorable'
import { ComponentProps, ReactNode, forwardRef } from 'react'
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

const ListItem = forwardRef<ComponentProps<typeof ListItemSC>, ListItemProps>(
  ({ last, ...props }, ref) => {
    const fillLevel = useFillLevel()

    return (
      <ListItemSC
        ref={ref}
        $fillLevel={fillLevel}
        $last={last}
        {...props}
      />
    )
  }
)

type ListProps = any & {
  children: ReactNode
}

const List = forwardRef<HTMLDivElement, ListProps>(
  ({ children, ...props }, ref) => (
    <Card
      ref={ref}
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
)

export { List, ListItem, fillLevelToBorderColor }
