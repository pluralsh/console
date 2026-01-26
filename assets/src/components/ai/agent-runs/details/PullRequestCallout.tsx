import {
  ArrowTopRightIcon,
  Button,
  Card,
  Flex,
  IconFrame,
  PrIcon,
} from '@pluralsh/design-system'
import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { PullRequestBasicFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'

export function PullRequestCallout({
  pullRequest,
}: {
  pullRequest: PullRequestBasicFragment
}) {
  const { colors } = useTheme()
  return (
    <CardSC>
      <IconFrame
        icon={<PrIcon color={colors['icon-light']} />}
        size="xlarge"
      />
      <Flex
        direction="column"
        gap="small"
        flex={1}
      >
        <StackedText
          first="Pull request"
          firstPartialType="body2Bold"
          firstColor="text"
          second={formatDateTime(pullRequest.insertedAt)}
          gap="xxsmall"
        />
        <Body2P $color="text-xlight">{pullRequest.title}</Body2P>
      </Flex>
      <Flex
        gap="medium"
        alignItems="center"
      >
        <PrStatusChip status={pullRequest.status} />
        <Button
          small
          as={Link}
          to={pullRequest.url}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowTopRightIcon />}
        >
          View PR
        </Button>
      </Flex>
    </CardSC>
  )
}

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  borderColor: theme.colors['border-fill-two'],
}))
