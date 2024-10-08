import {
  EmptyState,
  GraphQLToast,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactNode, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { StackRun, useStackRunQuery } from '../../../generated/graphql'
import { getBreadcrumbs } from '../Stacks'
import {
  STACK_RUNS_REL_PATH,
  getStackRunsAbsPath,
  getStacksAbsPath,
} from '../../../routes/stacksRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutContentContainer } from '../../utils/layout/ResponsiveLayoutContentContainer'

import StackRunHeader from './Header'
import StackRunSidecar from './Sidecar'

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

  const {
    data: stackRunQuery,
    loading: loadingStackRun,
    refetch,
    error,
  } = useStackRunQuery({
    variables: {
      id: runId!,
    },
    skip: !runId,
    pollInterval: 5_000,
  })

  const stackRun: StackRun = stackRunQuery?.stackRun as StackRun

  useSetBreadcrumbs(
    useMemo(
      () =>
        getRunBreadcrumbs(stackRun?.stack?.name, stackId || '', runId || ''),
      [runId, stackId, stackRun?.stack?.name]
    )
  )

  if (loadingStackRun) {
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
      <ResponsiveLayoutContentContainer maxWidth-desktopLarge-up="100%">
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
          <Outlet context={{ stackRun }} />
        </div>
      </ResponsiveLayoutContentContainer>
      <StackRunSidecar stackRun={stackRun} />
    </ResponsiveLayoutPage>
  )
}
