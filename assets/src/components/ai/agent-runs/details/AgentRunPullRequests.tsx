import {
  ArrowTopRightIcon,
  Card,
  IconFrame,
  prettifyRepoUrl,
} from '@pluralsh/design-system'
import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'
import { StackedText } from 'components/utils/table/StackedText'
import { PullRequestBasicFragment } from 'generated/graphql'
import styled from 'styled-components'

export function AgentRunPullRequests({
  pullRequests,
}: {
  pullRequests: PullRequestBasicFragment[]
}) {
  return (
    <>
      {pullRequests.map((pr) => (
        <WrapperCardSC
          key={pr.id}
          fillLevel={0}
          clickable
          forwardedAs="a"
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <StackedText
            truncate
            first={
              <span id={`link-${pr.id}`}>{prettifyRepoUrl(pr.url, true)}</span>
            }
            firstPartialType="body2"
            firstColor="text"
            second={pr.title}
          />
          <RightActionsSC>
            <PrStatusChip status={pr.status} />
            <IconFrame
              size="small"
              tooltip="View PR"
              icon={<ArrowTopRightIcon color="icon-light" />}
            />
          </RightActionsSC>
        </WrapperCardSC>
      ))}
    </>
  )
}

const WrapperCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.large,
  padding: theme.spacing.medium,
  textDecoration: 'none',
  '&:hover span[id^="link-"]': { textDecoration: 'underline' },
}))

const RightActionsSC = styled.div(({ theme }) => ({
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flexShrink: 0,
}))
