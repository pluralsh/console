import {
  type Breadcrumb,
  LoopingLogo,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo, useRef } from 'react'
import { Outlet, useLocation, useMatch, useParams } from 'react-router-dom'

import { useJobGateQuery } from 'generated/graphql'
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

export default function Account() {
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

  const { data, error } = useJobGateQuery({ variables: { id: jobId } })

  let content = <Outlet />

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
        {content}
      </TabPanel>
      <ResponsiveLayoutSidecarContainer />
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
