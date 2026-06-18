import {
  ArrowTopRightIcon,
  Button,
  Card,
  Flex,
  IconFrame,
  PrIcon,
} from '@pluralsh/design-system'
import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { PullRequestBasicFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'

export function AgentRunPullRequests({
  pullRequests,
}: {
  pullRequests: PullRequestBasicFragment[]
}) {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {pullRequests.map((pullRequest) => (
        <PullRequestCard
          key={pullRequest.id}
          pullRequest={pullRequest}
        />
      ))}
    </Flex>
  )
}

function PullRequestCard({
  pullRequest,
}: {
  pullRequest: PullRequestBasicFragment
}) {
  const { colors } = useTheme()

  return (
    <PRCardSC>
      <StackedText
        first="Pull request"
        firstPartialType="body2Bold"
        firstColor="text"
        second={formatDateTime(pullRequest.insertedAt)}
        gap="xxsmall"
        icon={
          <IconFrame
            circle
            type="secondary"
            icon={<PrIcon color={colors['icon-light']} />}
          />
        }
      />
      <Body2P $color="text-xlight">{pullRequest.title}</Body2P>
      <StretchedFlex>
        <PrStatusChip
          size="small"
          status={pullRequest.status}
        />
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
      </StretchedFlex>
    </PRCardSC>
  )
}

const PR_CARD_GRADIENT =
  'linear-gradient(316deg, #E3A966 4.06%, #7751C7 34.47%, #747AF6 71.29%, #606ECD 98.54%)'

const PRCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.large,
  backgroundImage: `linear-gradient(${theme.colors['fill-zero']}, ${theme.colors['fill-zero']}), ${PR_CARD_GRADIENT}`,
  backgroundClip: 'padding-box, border-box',
  backgroundOrigin: 'border-box',
  border: '1px solid transparent',
}))
