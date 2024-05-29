import {
  AppIcon,
  BriefcaseIcon,
  LoopingLogo,
  TabPanel,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createContext, useContext, useMemo, useRef } from 'react'
import {
  Outlet,
  useLocation,
  useMatch,
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
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { SideNavEntries } from 'components/layout/SideNavEntries'

import { useTheme } from 'styled-components'

import { Body2P, Subtitle2H1 } from 'components/utils/typography/Text'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { getStackRunsAbsPath } from 'routes/stacksRoutesConsts'

import { getRunBreadcrumbs } from '../Route'

const getDirectory = () => [
  { path: 'logs', label: 'Logs', enabled: true },
  { path: 'pods', label: 'Pods', enabled: true },
  { path: 'status', label: 'Status', enabled: true },
  { path: 'specs', label: 'Specs', enabled: true },
]

const getStackRunJobCrumbs = ({
  stackId,
  runId,
  tab,
}: {
  stackId: string
  runId: string
  tab: string
}) => [
  ...getRunBreadcrumbs(stackId, runId),
  { label: 'jobs' },
  { label: tab, url: `${getStackRunsAbsPath(stackId, runId)}/${tab}` },
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
  const tabStateRef = useRef<any>(null)
  const { stackId, runId } = useParams()
  const { pathname } = useLocation()

  const pathPrefix = `${getStackRunsAbsPath(stackId, runId)}/job`
  const tab = useMatch(`${pathPrefix}/:tab`)?.params?.tab || ''

  const directory = getDirectory().filter(({ enabled }) => enabled)

  const { data, error, refetch } = useStackRunJobQuery({
    variables: { id: runId || '' },
    pollInterval: POLL_INTERVAL,
  })

  useSetBreadcrumbs(
    useMemo(
      () =>
        getStackRunJobCrumbs({
          runId: runId || '',
          stackId: stackId || '',
          tab: tab || '',
        }),
      [runId, stackId, tab]
    )
  )
  const outletContext: OutletContextT = useMemo(
    () => ({
      refetch,
      status: data?.stackRun?.job?.status,
      metadata: data?.stackRun?.job?.metadata,
      raw: data?.stackRun?.job?.raw,
      spec: data?.stackRun?.job?.spec,
    }),
    [
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
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <div
          css={{
            display: 'flex',
            alignItem: 'center',
            gap: theme.spacing.small,
            marginBottom: theme.spacing.xsmall,
          }}
        >
          <AppIcon
            size="xsmall"
            icon={<BriefcaseIcon size={theme.spacing.large} />}
          />
          <div
            css={{
              minWidth: 0,
              '&>*': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            }}
          >
            <Tooltip label={name}>
              <Subtitle2H1
                css={{
                  margin: 0,
                }}
              >
                {name}
              </Subtitle2H1>
            </Tooltip>
            {name && (
              <Tooltip label={name}>
                <Body2P
                  css={{
                    color: theme.colors['text-light'],
                  }}
                >
                  Job gate
                </Body2P>
              </Tooltip>
            )}
          </div>
        </div>

        <SideNavEntries
          directory={directory}
          pathname={pathname}
          pathPrefix={pathPrefix}
        />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer />}
        stateRef={tabStateRef}
      >
        <PodsContext.Provider value={podsContext}>
          {content}
        </PodsContext.Provider>
      </TabPanel>
    </ResponsiveLayoutPage>
  )
}
