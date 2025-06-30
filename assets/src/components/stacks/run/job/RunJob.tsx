import {
  AppIcon,
  BriefcaseIcon,
  LoopingLogo,
  Tooltip,
} from '@pluralsh/design-system'
import { createContext, useContext, useMemo } from 'react'
import {
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  JobFragment,
  PipelineGateJobFragment,
  useStackRunJobQuery,
} from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { SideNavEntries } from 'components/layout/SideNavEntries'
import { useTheme } from 'styled-components'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import { getStackRunsAbsPath } from 'routes/stacksRoutesConsts'

import { TRUNCATE } from '../../../utils/truncate'
import { StackRunOutletContextT } from '../Route.tsx'

const DIRECTORY = [
  { path: 'logs', label: 'Logs' },
  { path: 'pods', label: 'Pods' },
  { path: 'status', label: 'Status' },
  { path: 'specs', label: 'Specs' },
]

const PodsContext =
  createContext<Nullable<PipelineGateJobFragment['pods']>>(undefined)

export const useJobPods = () => {
  const ctx = useContext(PodsContext)

  if (!ctx) {
    throw new Error('useJobPods must be used within a PodsContext.Provider')
  }

  return useContext(PodsContext)
}

type OutletContextT = {
  refetch: () => void
  status: Nullable<JobFragment['status']>
  metadata: Nullable<JobFragment['metadata']>
  raw: Nullable<JobFragment['raw']>
  spec: Nullable<JobFragment['spec']>
}
export const useRunJob = () => useOutletContext<OutletContextT>()

export default function RunJob() {
  const theme = useTheme()
  const {
    stackRun: { cluster },
  } = useOutletContext<StackRunOutletContextT>()

  const { stackId, runId } = useParams()
  const { pathname } = useLocation()

  const pathPrefix = `${getStackRunsAbsPath(stackId, runId)}/job`

  const { data, error, refetch } = useStackRunJobQuery({
    variables: { id: runId || '' },
    pollInterval: 5_000,
  })

  const outletContext: OutletContextT = useMemo(
    () => ({
      refetch,
      status: data?.stackRun?.job?.status,
      metadata: data?.stackRun?.job?.metadata,
      raw: data?.stackRun?.job?.raw,
      spec: data?.stackRun?.job?.spec,
      clusterId: cluster?.id,
    }),
    [
      cluster?.id,
      data?.stackRun?.job?.metadata,
      data?.stackRun?.job?.raw,
      data?.stackRun?.job?.spec,
      data?.stackRun?.job?.status,
      refetch,
    ]
  )
  const podsContext = useMemo(
    () => data?.stackRun?.job?.pods || [],
    [data?.stackRun?.job?.pods]
  )
  let content = <Outlet context={outletContext} />
  const stackRun = data?.stackRun
  const job = stackRun?.job
  const name = job?.metadata.name

  if (error) {
    content = <GqlError error={error} />
  } else if (!data) {
    content = <LoopingLogo />
  }

  return (
    <div
      css={{
        display: 'flex',
        height: '100%',
        width: '100%',
        overflowY: 'hidden',
        flexGrow: 1,
      }}
    >
      <ResponsiveLayoutSidenavContainer>
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.small,
            marginBottom: theme.spacing.medium,
          }}
        >
          <AppIcon
            size="xsmall"
            icon={<BriefcaseIcon size={theme.spacing.large} />}
          />
          <div css={{ minWidth: 0, '&>*': { ...TRUNCATE } }}>
            <Tooltip label={name}>
              <Subtitle2H1 css={{ margin: 0 }}>{name}</Subtitle2H1>
            </Tooltip>
          </div>
        </div>

        <SideNavEntries
          directory={DIRECTORY}
          pathname={pathname}
          pathPrefix={pathPrefix}
        />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer>
        <PodsContext.Provider value={podsContext}>
          {content}
        </PodsContext.Provider>
      </ResponsiveLayoutContentContainer>
    </div>
  )
}
