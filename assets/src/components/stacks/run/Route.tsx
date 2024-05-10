import { ReactNode } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import {
  InfrastructureStack,
  StackRun,
  useStackRunQuery,
  useStackTinyQuery,
} from '../../../generated/graphql'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSpacer } from '../../utils/layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutContentContainer } from '../../utils/layout/ResponsiveLayoutContentContainer'

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
  const { runId, stackId } = useParams()

  const { data: stackRunQuery, loading: loadinStackRun } = useStackRunQuery({
    variables: {
      id: runId!,
    },
    skip: !runId,
  })

  const stackRun: StackRun = stackRunQuery?.stackRun as StackRun

  if (loadinStackRun) {
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
        <Outlet
          context={{
            stackRun,
          }}
        />
      </ResponsiveLayoutContentContainer>
      <StackRunSidecar stackRun={stackRun} />
    </ResponsiveLayoutPage>
  )
}
