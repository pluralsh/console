import { Flex } from '@pluralsh/design-system'
import { Directory, SideNavEntries } from 'components/layout/SideNavEntries'
import {
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  CLUSTER_METADATA_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PODS_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'
import { ClusterContextType } from './Cluster'

export const CLUSTER_DETAILS_TABS = ['metadata', 'nodes', 'pods']

const DIRECTORY: Directory = [
  { path: CLUSTER_METADATA_PATH, label: 'Metadata' },
  { path: CLUSTER_NODES_PATH, label: 'Nodes' },
  { path: CLUSTER_PODS_PATH, label: 'Pods' },
]

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
