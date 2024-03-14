import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isEmpty } from 'lodash'
import Fuse from 'fuse.js'
import {
  ComboBox,
  Input,
  ListBoxItem,
  SearchIcon,
} from '@pluralsh/design-system'

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
import { NamespaceListFooter } from '../cluster/pods/Pods'

import { ResourceListContext, ResourceListContextT } from './ResourceList'

function NameFilter({
  value,
  onChange,
}: {
  value: string
  onChange: Dispatch<SetStateAction<string>>
}) {
  return (
    <Input
      height="fit-content"
      startIcon={<SearchIcon />}
      placeholder="Filter by name"
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      width={300}
    />
  )
}

function NamespaceFilter({
  namespaces,
  namespace,
  onChange,
}: {
  namespaces: string[]
  namespace: string
  onChange: (arg: any) => any
}) {
  const [value, setValue] = useState(namespace)

  const filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(namespaces, { threshold: 0.25 })

    return value ? fuse.search(value).map(({ item }) => item) : namespaces
  }, [namespaces, value])

  return (
    <ComboBox
      inputProps={{ placeholder: 'Filter by namespace' }}
      inputValue={value}
      onInputChange={setValue}
      selectedKey={namespace}
      onSelectionChange={(key) => {
        onChange(key)
        setValue(key as string)
      }}
      dropdownFooterFixed={
        <NamespaceListFooter
          onClick={() => {
            setValue('')
            onChange('')
          }}
        />
      }
      aria-label="namespace"
    >
      {filteredNamespaces.map((namespace) => (
        <ListBoxItem
          key={namespace}
          textValue={namespace}
          label={namespace}
        />
      ))}
    </ComboBox>
  )
}

type KubernetesContextT = {
  cluster?: ClusterTinyFragment // Currently selected cluster.
  namespace: string // Namespace filter.
  filter: string // Name filter.
}

const KubernetesContext = createContext<KubernetesContextT | undefined>(
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
  const [filter, setFilter] = useState('') // TODO: Keep in search params as well?
  const [namespace, setNamespace] = useState(
    searchParams.get(NAMESPACE_PARAM) ?? ''
  )
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [namespaced, setNamespaced] = useState<boolean>(false)
  const pathPrefix = getKubernetesAbsPath(clusterId)

  const { data: namespacesData } = useNamespacesQuery({
    client: KubernetesClient(clusterId!),
    skip: !clusterId,
  })

  const namespaces = useMemo(
    () =>
      (namespacesData?.handleGetNamespaces?.namespaces ?? [])
        .map((namespace) => namespace?.objectMeta?.name)
        .filter((namespace): namespace is string => !isEmpty(namespace)),
    [namespacesData?.handleGetNamespaces?.namespaces]
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
    () => ({ cluster, namespace, filter }) as KubernetesContextT,
    [cluster, namespace, filter]
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
          <div
            css={{
              display: 'flex',
              flexGrow: 1,
              gap: theme.spacing.medium,
              justifyContent: 'flex-end',
            }}
          >
            <NameFilter
              value={filter}
              onChange={(e) => setFilter(e)}
            />
            {namespaced && (
              <NamespaceFilter
                namespaces={namespaces}
                namespace={namespace}
                onChange={(ns) => {
                  setNamespace(ns)
                  setSearchParams({ namespace })
                }}
              />
            )}
          </div>
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
