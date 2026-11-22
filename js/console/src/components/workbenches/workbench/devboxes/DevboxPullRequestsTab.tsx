import {
  PullRequestList,
  withAge,
} from 'components/workbenches/common/PullRequestList'
import { CaptionP } from 'components/utils/typography/Text'
import { DevboxInstanceFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { prProvenance, prThreadLink } from './DevboxChips'
import { useDevboxPullRequests } from './devboxPullRequests'
import { threadTitle } from './devboxThreads'

// the instance's pull requests, each linking back to the thread that opened it
export function DevboxPullRequestsTab({
  instance,
}: {
  instance: DevboxInstanceFragment
}) {
  const { pullRequests } = useDevboxPullRequests(instance.id)

  return pullRequests.length ? (
    <PullRequestList
      pullRequests={pullRequests}
      titleTooltip={prProvenance}
      caption={(pr) => {
        const threadLink = prThreadLink(pr)
        return withAge(
          pr,
          pr.devboxThread && threadLink ? (
            <ThreadLinkSC to={threadLink}>
              {threadTitle(pr.devboxThread)}
            </ThreadLinkSC>
          ) : (
            'Opened outside a thread'
          )
        )
      }}
    />
  ) : (
    <CaptionP $color="text-xlight">
      No pull requests yet. Create one from the instance's changes with Create
      PR in the header, or ask an agent to open one.
    </CaptionP>
  )
}

const ThreadLinkSC = styled(Link)(({ theme }) => ({
  color: theme.colors['text-light'],
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
}))
