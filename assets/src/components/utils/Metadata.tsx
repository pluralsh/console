import { Card, SidecarProps } from '@pluralsh/design-system'
import { Div, Flex, H2 } from 'honorable'
import { Children, forwardRef } from 'react'
import styled from 'styled-components'
import { makeGrid } from 'utils/makeGrid'

const MAX_COLS = 4

const MetadataGridGrid = styled.div<{ maxCols: number }>(({ theme, maxCols = MAX_COLS }) => ({
  ...makeGrid({
    maxCols,
    minColWidth: 186,
    gap: theme.spacing.xlarge,
  }),
}))

export const MetadataCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing.xlarge,
  '& > *': {
    maxWidth: 1102,
  },
}))

export function MetadataGrid(props) {
  const numChildren = Children.count(props.children)
  const maxCols = numChildren < MAX_COLS ? numChildren : MAX_COLS

  return (
    <MetadataCard>
      <MetadataGridGrid
        maxCols={maxCols}
        {...props}
      />
    </MetadataCard>
  )
}

export const MetadataItem = forwardRef<HTMLDivElement, SidecarProps>(({
  heading, headingProps, contentProps, children, ...props
}, ref) => (
  <Flex
    ref={ref}
    direction="column"
    gap="xsmall"
    {...props}
  >
    {heading && (
      <H2
        body1
        bold
        color="text-default"
        {...headingProps}
      >
        {heading}
      </H2>
    )}
    {children && (
      <Div
        body1
        color="text-xlight"
        overflowWrap="anywhere"
        {...contentProps}
      >
        {children}
      </Div>
    )}
  </Flex>
))
