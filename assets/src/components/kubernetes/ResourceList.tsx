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
import { ClusterSelect } from '../cd/addOns/ClusterSelect'
import LoadingIndicator from '../utils/LoadingIndicator'
import { PageHeaderContext } from '../cd/ContinuousDeployment'
import { KubernetesClient } from '../../helpers/kubernetes.client'
import { useNamespacesQuery } from '../../generated/graphql-kubernetes'
import { NamespaceListFooter } from '../cluster/pods/Pods'

import { useCluster, useClusters } from './Cluster'

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

export const NAMESPACE_PARAM = 'namespace'
export const FILTER_PARAM = 'search'

const directory: Directory = [
  { path: WORKLOADS_REL_PATH, label: 'Workloads' },
  { path: DISCOVERY_REL_PATH, label: 'Discovery' },
  { path: STORAGE_REL_PATH, label: 'Storage' },
  { path: CONFIGURATION_REL_PATH, label: 'Configuration' },
  { path: ACCESS_REL_PATH, label: 'Access' },
  { path: CLUSTER_REL_PATH, label: 'Cluster' },
  { path: CUSTOM_RESOURCES_REL_PATH, label: 'Custom resources' },
] as const

type ResourceListContextT = {
  setNamespaced: Dispatch<SetStateAction<boolean>>
  namespace: string
  setNamespace: Dispatch<SetStateAction<string>>
  filter: string
  setFilter: Dispatch<SetStateAction<string>>
}

const ResourceListContext = createContext<ResourceListContextT | undefined>(
  undefined
)

export const useResourceListContext = () => {
  const ctx = useContext(ResourceListContext)

  if (!ctx) {
    throw Error(
      'useResourceListContext() must be used within a ResourceListContext'
    )
  }

  return ctx
}

export default function ResourceList() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { clusterId } = useParams()
  const clusters = useClusters()
  const cluster = useCluster()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState(params.get(FILTER_PARAM) ?? '')
  const [namespace, setNamespace] = useState(params.get(NAMESPACE_PARAM) ?? '')
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [namespaced, setNamespaced] = useState<boolean>(false)
  const pathPrefix = getKubernetesAbsPath(clusterId)

  const { data } = useNamespacesQuery({
    client: KubernetesClient(clusterId!),
    skip: !clusterId,
  })

  const namespaces = useMemo(
    () =>
      (data?.handleGetNamespaces?.namespaces ?? [])
        .map((namespace) => namespace?.objectMeta?.name)
        .filter((namespace): namespace is string => !isEmpty(namespace)),
    [data?.handleGetNamespaces?.namespaces]
  )

  const pageHeaderContext = useMemo(() => ({ setHeaderContent }), [])

  const resourceListContext = useMemo(
    () =>
      ({
        setNamespaced,
        namespace,
        setNamespace,
        filter,
        setFilter,
      }) as ResourceListContextT,
    [setNamespaced, namespace, setNamespace, filter, setFilter]
  )

  useEffect(() => {
    if (isEmpty(filter)) params.delete(FILTER_PARAM)
    else params.set(FILTER_PARAM, filter)

    if (isEmpty(namespace)) params.delete(NAMESPACE_PARAM)
    else params.set(NAMESPACE_PARAM, namespace)

    setParams(params)

    // TODO: Keeping pathname breaks breadcrumb nav but without it
    //  params get lost on category change, i.e. during discovery -> storage navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, filter, pathname])

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
              (id) => navigate(getKubernetesAbsPath(id as string) + search) // TODO: Keep current view when switching clusters.
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
          overflow: 'hidden',
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
              onChange={setFilter}
            />
            {namespaced && (
              <NamespaceFilter
                namespaces={namespaces}
                namespace={namespace}
                onChange={setNamespace}
              />
            )}
          </div>
        </div>
        <PageHeaderContext.Provider value={pageHeaderContext}>
          <ResourceListContext.Provider value={resourceListContext}>
            <Outlet />
          </ResourceListContext.Provider>
        </PageHeaderContext.Provider>
      </div>
    </ResponsiveLayoutPage>
  )
}
