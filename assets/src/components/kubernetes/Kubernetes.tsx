import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { isEmpty } from 'lodash'

import {
  ACCESS_REL_PATH,
  CLUSTER_REL_PATH,
  CONFIGURATION_REL_PATH,
  CUSTOM_RESOURCES_REL_PATH,
  DISCOVERY_REL_PATH,
  STORAGE_REL_PATH,
  WORKLOADS_REL_PATH,
  getKubernetesAbsPath,
} from '../../routes/kubernetesRoutesConsts'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'
import { Directory, SideNavEntries } from '../layout/SideNavEntries'
import {
  ClusterTinyFragment,
  useClustersTinyQuery,
} from '../../generated/graphql'
import { ClusterSelect } from '../cd/addOns/ClusterSelect'
import { mapExistingNodes } from '../../utils/graphql'
import LoadingIndicator from '../utils/LoadingIndicator'
import { PageHeaderContext } from '../cd/ContinuousDeployment'
import { KubernetesClient } from '../../helpers/kubernetes.client'
import { useNamespacesQuery } from '../../generated/graphql-kubernetes'

import { NamespaceSelect } from './NamespaceSelect'
import { ResourceListContext, ResourceListContextT } from './ResourceList'

export type KubernetesContextT = {
  cluster?: ClusterTinyFragment
  namespace: string
}

export const KubernetesContext = createContext<KubernetesContextT | undefined>(
  undefined
)

export const useKubernetesContext = () => {
  const ctx = useContext(KubernetesContext)

  if (!ctx) {
    throw Error(
      'useKubernetesContext() must be used within a KubernetesContext'
    )
  }

  return ctx
}

const NAMESPACE_PARAM = 'namespace'

const directory: Directory = [
  { path: WORKLOADS_REL_PATH, label: 'Workloads' },
  { path: DISCOVERY_REL_PATH, label: 'Discovery' },
  { path: STORAGE_REL_PATH, label: 'Storage' },
  { path: CONFIGURATION_REL_PATH, label: 'Configuration' },
  { path: ACCESS_REL_PATH, label: 'Access' },
  { path: CLUSTER_REL_PATH, label: 'Cluster' },
  { path: CUSTOM_RESOURCES_REL_PATH, label: 'Custom resources' },
] as const

export default function Kubernetes() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { clusterId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [namespace, setNamespace] = useState(
    searchParams.get(NAMESPACE_PARAM) ?? ''
  )
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [namespaced, setNamespaced] = useState<boolean>(false)
  const pathPrefix = getKubernetesAbsPath(clusterId)

  const { data: namespacesQuery } = useNamespacesQuery({
    client: KubernetesClient(clusterId!),
    skip: !clusterId,
  })

  const namespaces = useMemo(
    () =>
      namespacesQuery?.handleGetNamespaces?.namespaces?.map(
        (namespace) => namespace?.objectMeta?.name ?? ''
      ) ?? [],
    [namespacesQuery?.handleGetNamespaces?.namespaces]
  )

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

  const pageHeaderContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )

  const resourceListContext = useMemo(
    () => ({ setNamespaced }) as ResourceListContextT,
    []
  )

  const kubernetesContext = useMemo(
    () => ({ cluster, namespace }) as KubernetesContextT,
    [cluster, namespace]
  )

  useEffect(() => {
    if (!isEmpty(clusters) && !cluster) {
      const mgmtCluster = clusters.find(({ self }) => !!self)

      if (mgmtCluster) {
        navigate(getKubernetesAbsPath(mgmtCluster.id))
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
            clusters={clusters}
            selectedKey={clusterId}
            onSelectionChange={
              (id) => navigate(getKubernetesAbsPath(id as string)) // TODO: Keep current view if possible when switching clusters. Keep search params as well.
            }
            withoutTitleContent
          />
          <SideNavEntries
            directory={directory}
            pathname={pathname}
            pathPrefix={pathPrefix}
          />
        </div>
      </ResponsiveLayoutSidenavContainer>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          flexShrink: 1,
          height: '100%',
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div css={{ display: 'flex' }}>
          {headerContent}
          {namespaced && (
            <div
              css={{
                display: 'flex',
                flexGrow: 1,
                justifyContent: 'flex-end',
              }}
            >
              <NamespaceSelect
                namespaces={namespaces}
                namespace={namespace}
                onChange={(ns) => {
                  setNamespace(ns)
                  setSearchParams({ namespace })
                }}
              />
            </div>
          )}
        </div>
        <PageHeaderContext.Provider value={pageHeaderContext}>
          <ResourceListContext.Provider value={resourceListContext}>
            <KubernetesContext.Provider value={kubernetesContext}>
              <Outlet />
            </KubernetesContext.Provider>
          </ResourceListContext.Provider>
        </PageHeaderContext.Provider>
      </div>
    </ResponsiveLayoutPage>
  )
}
