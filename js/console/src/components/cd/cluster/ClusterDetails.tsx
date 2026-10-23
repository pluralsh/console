import {
  PageSidebarHeaderSC,
  PageSidebarSC,
} from 'components/layout/PageLayout'
import { PageSidebarNav } from 'components/layout/PageSidebarNav'
import { Body2BoldP } from 'components/utils/typography/Text'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import {
  CLUSTER_METADATA_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PRS_REL_PATH,
  getClusterDetailsPath,
  PODS_REL_PATH,
} from 'routes/cdRoutesConsts'
import { ClusterContextType, ClusterSidebarPortal } from './Cluster'

export const CLUSTER_DETAILS_TABS = {
  [CLUSTER_METADATA_PATH]: 'Metadata',
  [CLUSTER_NODES_PATH]: 'Nodes',
  [PODS_REL_PATH]: 'Pods',
  [CLUSTER_PRS_REL_PATH]: 'PRs',
} as const

const DIRECTORY = Object.entries(CLUSTER_DETAILS_TABS).map(([path, label]) => ({
  path,
  label,
}))

export function ClusterDetails() {
  const { clusterId } = useParams()
  const ctx = useOutletContext<ClusterContextType>() // passing this straight through
  const pathPrefix = `${getClusterDetailsPath({ clusterId })}/details`

  return (
    <>
      <ClusterSidebarPortal>
        <PageSidebarSC $width={200}>
          <PageSidebarHeaderSC>
            <Body2BoldP>Details</Body2BoldP>
          </PageSidebarHeaderSC>
          <PageSidebarNav
            directory={DIRECTORY}
            pathPrefix={pathPrefix}
          />
        </PageSidebarSC>
      </ClusterSidebarPortal>
      <Outlet context={ctx} />
    </>
  )
}
