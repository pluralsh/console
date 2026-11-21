import {
  PullRequestList,
  withAge,
} from 'components/workbenches/common/PullRequestList'
import { CaptionP } from 'components/utils/typography/Text'
import { DevboxInstanceFragment } from 'generated/graphql'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { WORKBENCH_DEVBOX_THREAD_QUERY_PARAM } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { prProvenance, prThreadLink } from './DevboxChips'
import { DevboxCreatePrButton } from './DevboxCreatePrButton'
import { useDevboxPullRequests } from './devboxPullRequests'
import { selectedThread, threadTitle } from './devboxThreads'

// the instance's pull requests, each linking back to the thread that opened it
export function DevboxPullRequestsTab({
  instance,
  live,
  headerActions,
}: {
  instance: DevboxInstanceFragment
  live: boolean
  headerActions?: Nullable<HTMLElement>
}) {
  const { pullRequests, refetch } = useDevboxPullRequests(instance.id)
  const [params] = useSearchParams()
  // the pr is credited to the session in view, so its row shows the open-pr icon
  const thread = selectedThread(
    instance.threads,
    params.get(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM)
  )

  return (
    <>
      {headerActions &&
        live &&
        createPortal(
          <DevboxCreatePrButton
            instanceId={instance.id}
            threadId={thread?.id}
            agentsRunning={(instance.runningThreads ?? 0) > 0}
            onCreated={() => refetch()}
          />,
          headerActions
        )}
      {pullRequests.length ? (
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
          No pull requests yet. Create one from the instance's changes, or ask
          an agent to open one.
        </CaptionP>
      )}
    </>
  )
}

const ThreadLinkSC = styled(Link)(({ theme }) => ({
  color: theme.colors['text-light'],
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
}))
