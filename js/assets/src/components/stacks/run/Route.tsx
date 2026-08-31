import {
  EmptyState,
  GraphQLToast,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactNode, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

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
import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { getBreadcrumbs } from '../Stacks'

import StackRunHeader from './Header'
import StackRunSidecar from './Sidecar'

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
  const theme = useTheme()

  const { data, loading, refetch, error } = useStackRunQuery({
    variables: { id: runId! },
    skip: !runId,
    pollInterval: 5_000,
    fetchPolicy: 'cache-and-network',
  })

  const stackRun = data?.stackRun

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
            marginHorizontal="xxxxlarge"
          />
        )}
        <EmptyState message="Stack run not found." />
      </>
    )
  }

  return (
    <ResponsiveLayoutPage css={{ paddingBottom: theme.spacing.large }}>
      <ResponsiveLayoutContentContainer css={{ maxWidth: '100%' }}>
        <StackRunHeader
          stackRun={stackRun}
          refetch={refetch}
        />
        <div
          css={{
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet
            context={
              {
                stackRun,
                refetch,
                loading,
              } satisfies StackRunOutletContextT
            }
          />
        </div>
      </ResponsiveLayoutContentContainer>
      <StackRunSidecar stackRun={stackRun} />
    </ResponsiveLayoutPage>
  )
}
