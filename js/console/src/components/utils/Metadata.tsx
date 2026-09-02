import { Card, CardProps, Flex, FlexProps } from '@pluralsh/design-system'
import { Children, ComponentPropsWithRef, ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import { makeGrid } from 'utils/makeGrid'
import { Body1BoldP } from './typography/Text'

const MAX_COLS = 4

export const CARD_CONTENT_MAX_WIDTH = 1526

const MetadataGridGrid = styled.div<{ $maxCols: number }>(
  ({ theme, $maxCols: maxCols = MAX_COLS }) => ({
    ...makeGrid({
      maxCols,
      minColWidth: 186,
      gap: theme.spacing.xlarge,
    }),
  })
)

export function MetadataCard({ children, ...props }: CardProps) {
  const { spacing } = useTheme()
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
          padding: spacing.xlarge,
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
        $maxCols={maxCols}
        {...props}
      />
    </MetadataCard>
  )
}

export function MetadataItem({
  heading,
  headingProps,
  contentProps,
  children,
  ...props
}: {
  heading: ReactNode
  headingProps?: ComponentPropsWithRef<typeof Body1BoldP>
  contentProps?: ComponentPropsWithRef<'div'>
} & FlexProps) {
  const theme = useTheme()
  return (
    <Flex
      direction="column"
      gap="xsmall"
      {...props}
    >
      {heading && (
        <Body1BoldP
          as="h2"
          $color="text"
          {...headingProps}
        >
          {heading}
        </Body1BoldP>
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
}
