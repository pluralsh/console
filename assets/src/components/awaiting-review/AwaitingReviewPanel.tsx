import {
  Card,
  ClipboardChecked,
  CloseIcon,
  Flex,
  IconFrame,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { AwaitingReviewStackFragment } from 'generated/graphql'
import { ApolloError } from '@apollo/client'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'
import { AwaitingReviewItem } from './AwaitingReviewItem'
import { Overline } from 'components/cd/utils/PermissionsModal'

export function AwaitingReviewPanel({
  stacks,
  loading,
  error,
  onClose,
  ...props
}: ComponentProps<typeof Card> & {
  stacks: AwaitingReviewStackFragment[]
  loading: boolean
  error?: ApolloError
  onClose: () => void
}) {
  const theme = useTheme()

  return (
    <Card
      fillLevel={1}
      css={{
        display: 'flex',
        flexDirection: 'column',
        border: theme.borders.input,
        minHeight: 0,
        width: 460,
        maxHeight: '70vh',
      }}
      {...props}
    >
      <Flex
        align="center"
        gap="xxxsmall"
        padding="xsmall"
        borderBottom={theme.borders.input}
      >
        <IconFrame icon={<ClipboardChecked color="icon-xlight" />} />
        <Overline css={{ flexGrow: 1 }}>Awaiting review</Overline>
        <IconFrame
          clickable
          size="xsmall"
          icon={<CloseIcon color="icon-light" />}
          onClick={onClose}
          tooltip="Close"
        />
      </Flex>
      <div css={{ overflow: 'auto', minHeight: 0 }}>
        {loading && isEmpty(stacks) ? (
          <RectangleSkeleton
            $width="100%"
            $height={120}
            css={{ padding: theme.spacing.medium }}
          />
        ) : error ? (
          <GqlError
            error={error}
            margin="medium"
          />
        ) : isEmpty(stacks) ? (
          <div
            css={{
              color: theme.colors['text-light'],
              minHeight: 120,
              padding: theme.spacing.medium,
            }}
          >
            No infrastructure stacks are awaiting review.
          </div>
        ) : (
          stacks.map((stack) => (
            <AwaitingReviewItem
              key={stack.id}
              stack={stack}
              onNavigate={onClose}
            />
          ))
        )}
      </div>
    </Card>
  )
}
