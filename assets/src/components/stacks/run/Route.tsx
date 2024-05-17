import React, { ReactNode, useEffect, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  LogsDeltaDocument,
  LogsDeltaSubscriptionVariables,
  RunLogAttributes,
  RunLogsDelta,
  RunStep,
  StackRun,
  StackRunQuery,
  StepStatus,
  useStackRunQuery,
} from '../../../generated/graphql'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSpacer } from '../../utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from '../../utils/layout/ResponsiveLayoutContentContainer'
import { getBreadcrumbs } from '../Stacks'
import { getStackRunsAbsPath } from '../../../routes/stacksRoutesConsts'

import StackRunSidenav from './Sidenav'
import StackRunSidecar from './Sidecar'

interface ZeroStateProps {
  id?: string
}

function ZeroState({ id }: ZeroStateProps): ReactNode {
  return (
    <h2
      css={{
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      No stack run found <br /> {id}
    </h2>
  )
}

export default function StackRunDetail(): ReactNode {
  const { stackId, runId } = useParams()
  const theme = useTheme()
  // const [subscribed, setSubscribed] = useState(false)

  const {
    data: stackRunQuery,
    loading: loadingStackRun,
    // subscribeToMore,
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
        { label: 'runs', url: getStackRunsAbsPath(stackId, runId) },
        ...(runId
          ? [{ label: runId, url: getStackRunsAbsPath(stackId, runId) }]
          : []),
      ],
      [runId, stackId]
    )
  )

  const stackRun: StackRun = stackRunQuery?.stackRun as StackRun

  // useEffect(() => {
  //   if (subscribed || !stackRun) {
  //     return
  //   }
  //
  //   console.log('subscribing')
  //   stackRun?.steps
  //     ?.filter((s) => s!.status === StepStatus.Running)
  //     .forEach((s) =>
  //       subscribeToMore<RunLogsDelta>({
  //         variables: { id: s!.id },
  //         document: LogsDeltaDocument,
  //         updateQuery: (
  //           prev,
  //           { subscriptionData: { data } }
  //         ): StackRunQuery => {
  //           const updatedStep = applyLogsDelta(s!, data as RunLogsDelta)
  //           const steps: Array<RunStep> = [
  //             ...((prev.stackRun?.steps?.filter(
  //               (s) => s!.id !== updatedStep.id
  //             ) as Array<RunStep>) ?? []),
  //             updatedStep,
  //           ]
  //
  //           console.log(data)
  //           console.log(updatedStep)
  //           console.log(steps)
  //
  //           return data
  //             ? ({
  //                 ...prev,
  //                 ...{ stackRun: { ...prev.stackRun, steps } },
  //               } as StackRunQuery)
  //             : prev
  //         },
  //       })
  //     )
  //
  //   setSubscribed(true)
  // }, [stackRun, stackRun?.steps, subscribeToMore, subscribed])

  if (loadingStackRun) {
    return <LoadingIndicator />
  }

  if (!stackRun) {
    return <ZeroState id={runId} />
  }

  return (
    <ResponsiveLayoutPage>
      <StackRunSidenav stackRun={stackRun} />
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer>
        <div
          css={{
            marginBottom: theme.spacing.large,
            overflow: 'hidden',
            width: '100%',
            height: '100%',
          }}
        >
          <Outlet
            context={{
              stackRun,
            }}
          />
        </div>
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSpacer />
      <StackRunSidecar stackRun={stackRun} />
    </ResponsiveLayoutPage>
  )
}
