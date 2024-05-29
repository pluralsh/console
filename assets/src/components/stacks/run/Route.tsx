import { EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
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

export default function StackRunDetail(): ReactNode {
  const { stackId, runId } = useParams()
  const theme = useTheme()

  const {
    data: stackRunQuery,
    loading: loadingStackRun,
    refetch,
  } = useStackRunQuery({
    variables: {
      id: runId!,
    },
    skip: !runId,
    pollInterval: 10_000,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(stackId ?? ''),
        {
          label: 'runs',
          url: `${getStacksAbsPath(stackId)}/${STACK_RUNS_REL_PATH}`,
        },
        ...(runId
          ? [{ label: runId, url: getStackRunsAbsPath(stackId, runId) }]
          : []),
      ],
      [runId, stackId]
    )
  )

  const stackRun: StackRun = stackRunQuery?.stackRun as StackRun

  if (loadingStackRun) {
    return <LoadingIndicator />
  }

  if (!stackRun) {
    return <EmptyState message="Stack run not found." />
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
