import { Card, type Sidecar } from '@pluralsh/design-system'
import { CardProps, Flex } from 'honorable'
import { Children, ComponentProps, forwardRef } from 'react'
import styled, { useTheme } from 'styled-components'
import { makeGrid } from 'utils/makeGrid'

const MAX_COLS = 4

export const CARD_CONTENT_MAX_WIDTH = 1526

const MetadataGridGrid = styled.div<{ maxCols: number }>(
  ({ theme, maxCols = MAX_COLS }) => ({
    ...makeGrid({
      maxCols,
      minColWidth: 186,
      gap: theme.spacing.xlarge,
    }),
  })
)

export function MetadataCard({ children, ...props }: CardProps) {
  const theme = useTheme()

  return (
    <Card
      display="flex"
      justifyContent="center"
      {...props}
    >
      {/* 1526 is magic number which is the card's width when screen is 1940px wide */}
      <div
        css={{
          maxWidth: CARD_CONTENT_MAX_WIDTH,
          width: '100%',
          padding: theme.spacing.xlarge,
        }}
      >
        {children}
      </div>
    </Card>
  )
}

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

export const MetadataItem = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof Sidecar>
>(({ heading, headingProps, contentProps, children, ...props }, ref) => {
  const theme = useTheme()

  return (
    <Flex
      ref={ref}
      direction="column"
      gap="xsmall"
      {...props}
    >
      {heading && (
        <h2
          css={{
            ...theme.partials.text.body1Bold,
          }}
          {...headingProps}
        >
          {heading}
        </h2>
      )}
      {children && (
        <div
          css={{
            ...theme.partials.text.body1,
            color: theme.colors['text-xlight'],
            overflowWrap: 'anywhere',
          }}
          {...contentProps}
        >
          {children}
        </div>
      )}
    </Flex>
  )
})
