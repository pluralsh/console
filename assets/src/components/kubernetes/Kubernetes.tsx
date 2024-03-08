import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { useEffect, useMemo } from 'react'

import { isEmpty } from 'lodash'

import {
  CONFIGURATION_REL_PATH,
  SERVICES_REL_PATH,
  STORAGE_REL_PATH,
  WORKLOADS_REL_PATH,
} from '../../routes/kubernetesRoutesConsts'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'
import { Directory, SideNavEntries } from '../layout/SideNavEntries'
import { ResponsiveLayoutContentContainer } from '../utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from '../utils/layout/ResponsiveLayoutSidecarContainer'
import {
  ClusterTinyFragment,
  useClustersTinyQuery,
} from '../../generated/graphql'
import { ClusterSelect } from '../cd/addOns/ClusterSelect'
import { mapExistingNodes } from '../../utils/graphql'
import LoadingIndicator from '../utils/LoadingIndicator'

export type KubernetesContext = {
  cluster?: ClusterTinyFragment
}

const directory: Directory = [
  { path: WORKLOADS_REL_PATH, label: 'Workloads' },
  { path: SERVICES_REL_PATH, label: 'Services' },
  { path: STORAGE_REL_PATH, label: 'Storage' },
  { path: CONFIGURATION_REL_PATH, label: 'Configuration' },
  // namespaces
  // crs
  // events
  // ...
] as const

export default function Kubernetes() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { clusterId } = useParams()
  const pathPrefix = clusterId ? `/kubernetes/${clusterId}` : `/kubernetes`

  const { data } = useClustersTinyQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
  })

  const clusters = useMemo(
    () => mapExistingNodes(data?.clusters),
    [data?.clusters]
  )

  const cluster = useMemo(
    () => clusters.find(({ id }) => id === clusterId),
    [clusterId, clusters]
  )

  const context: KubernetesContext = useMemo(() => ({ cluster }), [cluster])

  useEffect(() => {
    if (!isEmpty(clusters) && !cluster) {
      const mgmtCluster = clusters.find(({ self }) => !!self)

      if (mgmtCluster) {
        navigate(`/kubernetes/${mgmtCluster.id}`)
      }
    }
  }, [cluster, clusters, navigate])

  if (!cluster) return <LoadingIndicator />

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            paddingBottom: theme.spacing.medium,
            gap: theme.spacing.large,
          }}
        >
          <ClusterSelect
            label="Select cluster"
            clusters={clusters}
            selectedKey={clusterId}
            onSelectionChange={(id) => {
              navigate(`/kubernetes/${id}`)
            }}
            withoutTitleContent
          />
          <SideNavEntries
            directory={directory}
            pathname={pathname}
            pathPrefix={pathPrefix}
          />
        </div>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutContentContainer
        role="main"
        width="100%"
      >
        <Outlet context={context} />
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer />
    </ResponsiveLayoutPage>
  )
}
