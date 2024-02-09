import {
  type Breadcrumb,
  LoopingLogo,
  TabPanel,
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

import { PipelineGateJobFragment, useJobGateQuery } from 'generated/graphql'
import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { SideNavEntries } from 'components/layout/SideNavEntries'

import { PIPELINES_CRUMBS } from '../Pipelines'

const getDirectory = () => [
  { path: 'logs', label: 'Logs', enabled: true },
  { path: 'pods', label: 'Pods', enabled: true },
  { path: 'status', label: 'Status', enabled: true },
  { path: 'specs', label: 'Specs', enabled: true },
]

const getPipelineJobBreadcrumbs = ({
  job,
  tab,
}: {
  job: { id }
  tab: string
}): Breadcrumb[] => [
  ...PIPELINES_CRUMBS,
  { label: 'jobs' },
  { label: job.id, url: `${PIPELINES_ABS_PATH}/jobs/${job.id}/logs` },
  { label: tab, url: `${PIPELINES_ABS_PATH}/jobs/${job.id}/${tab}` },
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

type OutletContextT = { refetch: () => void }
export const usePipelineJob = () => useOutletContext<OutletContextT>()

export default function PipelineJob() {
  const tabStateRef = useRef<any>(null)
  const jobId = useParams().jobId!
  const { pathname } = useLocation()

  const pathPrefix = `${PIPELINES_ABS_PATH}/jobs/${jobId}`
  const tab = useMatch(`${pathPrefix}/:tab`)?.params?.tab || ''

  const directory = getDirectory().filter(({ enabled }) => enabled)

  useSetBreadcrumbs(
    useMemo(
      () => getPipelineJobBreadcrumbs({ job: { id: jobId }, tab }),
      [jobId, tab]
    )
  )

  const { data, error, refetch } = useJobGateQuery({ variables: { id: jobId } })

  const outletContext: OutletContextT = useMemo(() => ({ refetch }), [refetch])
  let content = <Outlet context={outletContext} />

  if (error) {
    content = <GqlError error={error} />
  } else if (!data) {
    content = <LoopingLogo />
  }

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
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
        <PodsContext.Provider value={data?.pipelineGate?.job?.pods || null}>
          {content}
        </PodsContext.Provider>
      </TabPanel>
      <ResponsiveLayoutSidecarContainer />
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
