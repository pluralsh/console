import { Accordion, Card, Flex, Markdown } from '@pluralsh/design-system'
import {
  useCreateWorkbenchMessageMutation,
  useWorkbenchJobActivitiesQuery,
  useWorkbenchJobActivityDeltaSubscription,
  WorkbenchJobActivitiesDocument,
  WorkbenchJobActivitiesQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { useMemo, useRef, useState } from 'react'

import { ApolloCache, useApolloClient } from '@apollo/client'
import {
  ChatInputSimple,
  ChatInputSimpleRef,
} from 'components/ai/chatbot/input/ChatInput'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { VirtualList } from 'components/utils/VirtualList'
import styled from 'styled-components'
import {
  appendConnectionToEnd,
  mapExistingNodes,
  updateCache,
} from 'utils/graphql'
import { WorkbenchJobActivity } from './WorkbenchJobActivity'

export const ACTIVITY_GAP = 'medium' as const

function isActivityTerminal(status: WorkbenchJobActivityStatus | undefined) {
  return (
    status === WorkbenchJobActivityStatus.Successful ||
    status === WorkbenchJobActivityStatus.Failed
  )
}

export function WorkbenchJobActivities({ jobId }: { jobId: string }) {
  const client = useApolloClient()
  const [newMessage, setNewMessage] = useState('')
  const chatInputRef = useRef<ChatInputSimpleRef>(null)
  const { data, loading, error } = useWorkbenchJobActivitiesQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  })
  const job = data?.workbenchJob
  const activities = mapExistingNodes(job?.activities)

  const [closedIds, setClosedIds] = useState<Set<string> | null>(null)
  if (closedIds === null && !!data) setClosedIds(defaultClosedIds(activities))

  const openIds = useMemo(
    () => activities.filter((a) => !closedIds?.has(a.id)).map((a) => a.id),
    [activities, closedIds]
  )

  useWorkbenchJobActivityDeltaSubscription({
    variables: { jobId },
    onData: ({ data: { data } }) => {
      const id = data?.workbenchJobActivityDelta?.payload?.id
      if (
        id &&
        isActivityTerminal(data?.workbenchJobActivityDelta?.payload?.status)
      )
        setClosedIds(new Set(closedIds ? closedIds.add(id) : new Set([id])))

      appendActivityToCache(
        client.cache,
        jobId,
        data?.workbenchJobActivityDelta?.payload
      )
    },
  })

  const [
    createMessage,
    { loading: createMessageLoading, error: createMessageError },
  ] = useCreateWorkbenchMessageMutation({
    variables: { jobId, attributes: { prompt: newMessage } },
    update: (cache, { data }) =>
      appendActivityToCache(cache, jobId, data?.createWorkbenchMessage),
    onCompleted: () => {
      setNewMessage('')
      chatInputRef.current?.resetInput?.()
    },
  })

  if (!data && loading)
    return (
      <RectangleSkeleton
        $width="100%"
        $height="100%"
      />
    )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
    >
      {createMessageError && <GqlError error={createMessageError} />}
      <ActivitiesPanelSC>
        <ActivitiesAccordionSC
          type="multiple"
          value={openIds}
          onValueChange={(newOpenIds: string[]) => {
            setClosedIds(
              new Set(
                activities
                  .filter((a) => !newOpenIds.includes(a.id))
                  .map((a) => a.id)
              )
            )
          }}
        >
          <VirtualList
            isReversed
            data={activities}
            topContent={
              <JobPromptCardSC>
                <Markdown text={job?.prompt ?? ''} />
              </JobPromptCardSC>
            }
            renderer={({ rowData }) => (
              <WorkbenchJobActivity
                isOpen={openIds.includes(rowData.id)}
                activity={rowData}
                progress={[]} // TODO
              />
            )}
          />
        </ActivitiesAccordionSC>
      </ActivitiesPanelSC>
      <ChatInputSimple
        ref={chatInputRef}
        placeholder="Send an additional message to this job"
        loading={createMessageLoading}
        setValue={setNewMessage}
        onSubmit={() => createMessage()}
        allowSubmit={!!newMessage}
        wrapperStyles={{ minHeight: 90 }}
      />
    </Flex>
  )
}

const ActivitiesAccordionSC = styled(Accordion)({
  border: 'none',
  background: 'none',
  height: '100%',
})

const ActivitiesPanelSC = styled.div(({ theme }) => ({
  position: 'relative',
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.medium,
  padding: `${theme.spacing.xlarge}px ${theme.spacing.large}px`,
  background: theme.colors['fill-zero'],
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 0,
  overflow: 'auto',
}))

const JobPromptCardSC = styled(Card)(({ theme }) => ({
  ...theme.partials.text.body2,
  borderRadius: theme.borderRadiuses.medium,
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  wordBreak: 'break-word',
  marginBottom: theme.spacing.small,
}))

const lastActivityId = (
  activities: WorkbenchJobActivityFragment[]
): string | null => {
  const last = activities.findLast(
    (a) => a.type !== WorkbenchJobActivityType.Memo
  )
  if (last) return last.id
  return null
}

const defaultClosedIds = (
  activities: WorkbenchJobActivityFragment[]
): Set<string> => {
  const lastId = lastActivityId(activities)

  return new Set(
    activities
      .filter((a) => a.id !== lastId && isActivityTerminal(a.status))
      .map((a) => a.id)
  )
}

const appendActivityToCache = (
  cache: ApolloCache<object>,
  jobId: string,
  activity: Nullable<WorkbenchJobActivityFragment>
) =>
  updateCache<WorkbenchJobActivitiesQuery>(cache, {
    query: WorkbenchJobActivitiesDocument,
    variables: { id: jobId },
    update: (prev) => ({
      ...prev,
      workbenchJob: appendConnectionToEnd(
        prev.workbenchJob,
        activity,
        'activities'
      ),
    }),
  })
