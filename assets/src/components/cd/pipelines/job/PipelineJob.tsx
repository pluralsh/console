import {
  AppIcon,
  type Breadcrumb,
  BriefcaseIcon,
  Chip,
  LoopingLogo,
  Sidecar,
  SidecarItem,
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
import capitalize from 'lodash/capitalize'

import {
  JobFragment,
  PipelineGateFragment,
  PipelineGateJobFragment,
  useJobGateQuery,
} from 'generated/graphql'
import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { SideNavEntries } from 'components/layout/SideNavEntries'

import { useTheme } from 'styled-components'

import { Body2P, Subtitle2H1 } from 'components/utils/typography/Text'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { PIPELINES_CRUMBS } from '../Pipelines'

const getDirectory = () => [
  { path: 'logs', label: 'Logs', enabled: true },
  { path: 'pods', label: 'Pods', enabled: true },
  { path: 'status', label: 'Status', enabled: true },
  { path: 'specs', label: 'Specs', enabled: true },
]

const getPipelineJobBreadcrumbs = ({
  gate,
  tab,
}: {
  gate?: Nullable<PipelineGateFragment>
  tab: string
}): Breadcrumb[] => [
  ...PIPELINES_CRUMBS,
  { label: 'jobs' },
  ...(!gate
    ? []
    : [
        {
          label: gate.name,
          url: `${PIPELINES_ABS_PATH}/jobs/${gate.id}/logs`,
        },
        { label: tab, url: `${PIPELINES_ABS_PATH}/jobs/${gate.id}/${tab}` },
      ]),
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
export const usePipelineJob = () => useOutletContext<OutletContextT>()

export default function PipelineJob() {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const jobId = useParams().jobId!
  const { pathname } = useLocation()

  const pathPrefix = `${PIPELINES_ABS_PATH}/jobs/${jobId}`
  const tab = useMatch(`${pathPrefix}/:tab`)?.params?.tab || ''

  const directory = getDirectory().filter(({ enabled }) => enabled)

  const { data, error, refetch } = useJobGateQuery({
    variables: { id: jobId },
    pollInterval: POLL_INTERVAL,
  })

  useSetBreadcrumbs(
    useMemo(
      () => getPipelineJobBreadcrumbs({ gate: data?.pipelineGate, tab }),
      [data?.pipelineGate, tab]
    )
  )
  const outletContext: OutletContextT = useMemo(
    () => ({
      refetch,
      status: data?.pipelineGate?.job?.status,
      metadata: data?.pipelineGate?.job?.metadata,
      raw: data?.pipelineGate?.job?.raw,
      spec: data?.pipelineGate?.job?.spec,
    }),
    [
      data?.pipelineGate?.job?.metadata,
      data?.pipelineGate?.job?.raw,
      data?.pipelineGate?.job?.spec,
      data?.pipelineGate?.job?.status,
      refetch,
    ]
  )
  const podsContext = useMemo(
    () => data?.pipelineGate?.job?.pods || [],
    [data?.pipelineGate?.job?.pods]
  )
  let content = <Outlet context={outletContext} />
  const gate = data?.pipelineGate
  const job = gate?.job
  const name = gate?.name

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
      <ResponsiveLayoutSidecarContainer>
        {gate && (
          <Sidecar>
            {job?.metadata.name && (
              <SidecarItem heading="Job name">{job?.metadata.name}</SidecarItem>
            )}
            {job?.metadata.namespace && (
              <SidecarItem heading="Job namespace">
                {gate?.job?.metadata.namespace}
              </SidecarItem>
            )}
            <SidecarItem heading="Status">
              <Chip>{capitalize(gate?.state)}</Chip>
            </SidecarItem>
            <SidecarItem heading="Build type">Job</SidecarItem>
            <SidecarItem heading="ID">{gate.id}</SidecarItem>
          </Sidecar>
        )}
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
