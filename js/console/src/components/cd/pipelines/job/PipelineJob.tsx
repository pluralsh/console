import {
  type Breadcrumb,
  Chip,
  LoopingLogo,
  Sidecar,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createContext, useContext, useMemo, useState } from 'react'
import { Outlet, useMatch, useOutletContext, useParams } from 'react-router-dom'
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
import { PageColumnSC, PageRowSC } from 'components/layout/PageLayout'
import {
  PageToolbar,
  PageToolbarSlotContext,
} from 'components/layout/PageToolbar'

import styled from 'styled-components'

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
  {
    label: gate?.edge?.pipeline?.name || 'pipeline',
    url: `${PIPELINES_ABS_PATH}/${gate?.edge?.pipeline?.id ?? ''}`,
  },
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

  return ctx
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
  const jobId = useParams().jobId!
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  const pathPrefix = `${PIPELINES_ABS_PATH}/jobs/${jobId}`
  const tab = useMatch(`${pathPrefix}/:tab`)?.params?.tab || ''

  const directory = getDirectory().filter(({ enabled }) => enabled)

  const { data, error, refetch } = useJobGateQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
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
      clusterId: data?.pipelineGate?.cluster?.id,
    }),
    [
      data?.pipelineGate?.cluster?.id,
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

  if (error) {
    content = <GqlError error={error} />
  } else if (!data) {
    content = <LoopingLogo />
  }

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={directory.map(({ path, label }) => ({
          path: `${pathPrefix}/${path}`,
          label,
        }))}
        activeFn={(path) => path === `${pathPrefix}/${tab}`}
        slotRef={setToolbarSlot}
      />
      <PageToolbarSlotContext value={toolbarSlot}>
        <BodySC>
          <ResponsiveLayoutSpacer />
          <ResponsiveLayoutContentContainer role="main">
            <PodsContext.Provider value={podsContext}>
              {content}
            </PodsContext.Provider>
          </ResponsiveLayoutContentContainer>
          <ResponsiveLayoutSidecarContainer>
            {gate && (
              <Sidecar>
                {job?.metadata.name && (
                  <SidecarItem heading="Job name">
                    {job?.metadata.name}
                  </SidecarItem>
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
        </BodySC>
      </PageToolbarSlotContext>
    </PageColumnSC>
  )
}

const BodySC = styled(PageRowSC)(({ theme }) => ({
  padding: `${theme.spacing.large} ${theme.spacing.large} 0`,
}))
