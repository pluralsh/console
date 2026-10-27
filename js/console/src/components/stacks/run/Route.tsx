import {
  EmptyState,
  GraphQLToast,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageColumnSC } from 'components/layout/PageLayout'
import {
  PageToolbar,
  PageToolbarSlotContext,
} from 'components/layout/PageToolbar'
import { ReactNode, useMemo, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  StackRunDetailsFragment,
  useStackRunQuery,
} from '../../../generated/graphql'
import {
  getStackRunsAbsPath,
  getStacksAbsPath,
  STACK_RUNS_REL_PATH,
} from '../../../routes/stacksRoutesConsts'
import { ResponsiveLayoutContentContainer } from '../../utils/layout/ResponsiveLayoutContentContainer'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useStackRunDeltas } from '../common/useStackDeltas'
import { getBreadcrumbs } from '../Stacks'

import StackRunHeader, {
  getStackRunDirectory,
  StackRunHeaderButtons,
} from './Header'
import StackRunSidecar from './Sidecar'

// run updates arrive as run deltas, but step progress emits no events, so
// this still polls faster than the other stack views
const RUN_POLL_INTERVAL = 15_000

export type StackRunOutletContextT = {
  stackRun: StackRunDetailsFragment
  refetch: () => void
  loading: boolean
}

export function getRunBreadcrumbs(
  stackName: Nullable<string>,
  stackId: string,
  runId: string
) {
  return [
    ...getBreadcrumbs(stackId, stackName),
    {
      label: 'runs',
      url: `${getStacksAbsPath(stackId)}/${STACK_RUNS_REL_PATH}`,
    },
    ...(runId
      ? [{ label: runId, url: getStackRunsAbsPath(stackId, runId) }]
      : []),
  ]
}

export default function StackRunDetail(): ReactNode {
  const { stackId, runId } = useParams()
  const { pathname } = useLocation()
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  const { data, previousData, loading, refetch, error } = useStackRunQuery({
    variables: { id: runId! },
    skip: !runId,
    pollInterval: RUN_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  useStackRunDeltas(stackId)

  // a mutation can briefly leave the cached run incomplete while it refetches,
  // so keep rendering the last known copy instead of flashing the page loader
  const stackRun =
    data?.stackRun ??
    (previousData?.stackRun?.id === runId ? previousData?.stackRun : undefined)

  const { tabs, activePath } = useMemo(() => {
    if (!stackRun) return { tabs: [], activePath: '' }
    const basePath = getStackRunsAbsPath(stackId, runId)
    const directory = getStackRunDirectory(stackRun).filter(
      (d) => d.condition?.(stackRun) ?? true
    )
    const current =
      directory.find((d) => d.path && pathname.includes(d.path)) ?? directory[0]

    return {
      tabs: directory.map(({ label, path }) => ({
        label,
        path: path ? `${basePath}/${path}` : basePath,
      })),
      activePath: current?.path ? `${basePath}/${current.path}` : basePath,
    }
  }, [stackRun, stackId, runId, pathname])

  useSetBreadcrumbs(
    useMemo(
      () =>
        getRunBreadcrumbs(stackRun?.stack?.name, stackId || '', runId || ''),
      [runId, stackId, stackRun?.stack?.name]
    )
  )

  if (loading && !stackRun) {
    return <LoadingIndicator />
  }

  if (!stackRun || error) {
    return (
      <>
        {error && (
          <GraphQLToast
            error={{ graphQLErrors: [{ ...error }] }}
            header="Error"
            margin="medium"
            marginLeft="xxxxlarge"
            marginRight="xxxxlarge"
          />
        )}
        <EmptyState message="Stack run not found." />
      </>
    )
  }

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={tabs}
        activeFn={(path) => path === activePath}
        slotRef={setToolbarSlot}
      >
        <StackRunHeaderButtons
          stackRun={stackRun}
          refetch={refetch}
        />
      </PageToolbar>
      <BodySC>
        <ResponsiveLayoutContentContainer css={{ maxWidth: '100%' }}>
          <StackRunHeader stackRun={stackRun} />
          <div
            css={{
              overflow: 'hidden',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PageToolbarSlotContext value={toolbarSlot}>
              <Outlet
                context={
                  {
                    stackRun,
                    refetch,
                    loading,
                  } satisfies StackRunOutletContextT
                }
              />
            </PageToolbarSlotContext>
          </div>
        </ResponsiveLayoutContentContainer>
        <StackRunSidecar stackRun={stackRun} />
      </BodySC>
    </PageColumnSC>
  )
}

const BodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  padding: theme.spacing.large,
}))
