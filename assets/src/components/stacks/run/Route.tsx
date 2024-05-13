import { ReactNode } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import { useTheme } from 'styled-components'

import { StackRun, useStackRunQuery } from '../../../generated/graphql'
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
  const { runId } = useParams()
  const theme = useTheme()

  const { data: stackRunQuery, loading: loadingStackRun } = useStackRunQuery({
    variables: {
      id: runId!,
    },
    skip: !runId,
    pollInterval: 10_000,
  })

  const stackRun: StackRun = stackRunQuery?.stackRun as StackRun

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
      <StackRunSidecar stackRun={stackRun} />
    </ResponsiveLayoutPage>
  )
}
