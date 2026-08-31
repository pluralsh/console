import { Flex } from '@pluralsh/design-system'
import { SideNavEntries } from 'components/layout/SideNavEntries'
import {
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  CLUSTER_METADATA_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PRS_REL_PATH,
  getClusterDetailsPath,
  PODS_REL_PATH,
} from 'routes/cdRoutesConsts'
import { ClusterContextType } from './Cluster'

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
  const { pathname } = useLocation()
  const { clusterId } = useParams()
  const ctx = useOutletContext<ClusterContextType>() // passing this straight through
  const pathPrefix = `${getClusterDetailsPath({ clusterId })}/details`

  return (
    <Flex
      height="100%"
      width="100%"
      gap="xlarge"
    >
      <div css={{ width: 200, flexShrink: 0 }}>
        <SideNavEntries
          directory={DIRECTORY}
          pathname={pathname}
          pathPrefix={pathPrefix}
        />
      </div>
      <Outlet context={ctx} />
    </Flex>
  )
}
