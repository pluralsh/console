import { EmptyState, Flex } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import {
  useWorkbenchJobActionsQuery,
  WorkbenchJobActionFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { WorkbenchJobActionCard } from './WorkbenchJobActionCard'
import { WorkbenchJobActionDetail } from './WorkbenchJobActionDetail'
import {
  groupWorkbenchJobActions,
  mapActionNodes,
} from './workbenchJobActionsUtils'

export function WorkbenchJobActions({ jobId }: { jobId: string }) {
  const theme = useTheme()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, loading, error } = useWorkbenchJobActionsQuery({
    variables: { id: jobId },
    skip: !jobId,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const actions = useMemo(
    () =>
      [
        ...mapActionNodes(data?.workbenchJob?.functionActions?.edges),
        ...mapActionNodes(data?.workbenchJob?.kubernetesActions?.edges),
        ...mapActionNodes(data?.workbenchJob?.execActions?.edges),
      ].sort((a, b) => (a.insertedAt ?? '').localeCompare(b.insertedAt ?? '')),
    [data]
  )
  const sections = useMemo(
    () => groupWorkbenchJobActions(actions, theme),
    [actions, theme]
  )
  const selected = useMemo(
    () => actions.find((action) => action.id === selectedId) ?? null,
    [actions, selectedId]
  )

  if (selected) {
    return (
      <WorkbenchJobActionDetail
        activity={selected}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  if (error && isEmpty(actions)) {
    return <GqlError error={error} />
  }

  if (loading && isEmpty(actions)) {
    return (
      <TableSkeleton
        centered
        width={400}
        numColumns={1}
      />
    )
  }

  if (isEmpty(sections)) {
    return <EmptyState message="No actions for this job yet." />
  }

  return (
    <ListSC>
      {sections.map((section) => (
        <SectionSC key={section.key}>
          <Flex
            align="center"
            gap="xsmall"
          >
            {section.icon}
            <CaptionP
              $color="text-xlight"
              css={{
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {section.label} {section.count}
            </CaptionP>
          </Flex>
          <CardsSC>
            {section.actions.map((activity: WorkbenchJobActionFragment) => (
              <WorkbenchJobActionCard
                key={activity.id}
                activity={activity}
                onView={() => setSelectedId(activity.id)}
              />
            ))}
          </CardsSC>
        </SectionSC>
      ))}
    </ListSC>
  )
}

const ListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
}))

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))

const CardsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))
