import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useTheme } from 'styled-components'
import { ReactNode, useLayoutEffect, useMemo, useState } from 'react'
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
import { ClusterSelect } from '../cd/addOns/ClusterSelect'
import LoadingIndicator from '../utils/LoadingIndicator'
import { PageHeaderContext } from '../cd/ContinuousDeployment'
import { KubernetesClient } from '../../helpers/kubernetes.client'
import { useNamespacesQuery } from '../../generated/graphql-kubernetes'

import { useCluster, useClusters } from './Cluster'
import { DataSelect, useDataSelect } from './common/DataSelect'
import { NamespaceFilter } from './common/NamespaceFilter'
import { NameFilter } from './common/NameFilter'

export const NAMESPACE_PARAM = 'namespace'
export const FILTER_PARAM = 'filter'

const directory: Directory = [
  { path: WORKLOADS_REL_PATH, label: 'Workloads' },
  { path: DISCOVERY_REL_PATH, label: 'Discovery' },
  { path: STORAGE_REL_PATH, label: 'Storage' },
  { path: CONFIGURATION_REL_PATH, label: 'Configuration' },
  { path: ACCESS_REL_PATH, label: 'Access' },
  { path: CLUSTER_REL_PATH, label: 'Cluster' },
  { path: CUSTOM_RESOURCES_REL_PATH, label: 'Custom resources' },
] as const

export default function Navigation() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { clusterId = '' } = useParams()
  const clusters = useClusters()
  const cluster = useCluster()
  const [params, setParams] = useSearchParams()
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const pathPrefix = getKubernetesAbsPath(clusterId)

  const dataSelect = useDataSelect({
    namespace: params.get(NAMESPACE_PARAM) ?? '',
    filter: params.get(FILTER_PARAM) ?? '',
  })

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

  useLayoutEffect(() => {
    if (isEmpty(dataSelect.filter)) params.delete(FILTER_PARAM)
    else params.set(FILTER_PARAM, dataSelect.filter)

    if (isEmpty(dataSelect.namespace)) params.delete(NAMESPACE_PARAM)
    else params.set(NAMESPACE_PARAM, dataSelect.namespace)

    setParams(params)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSelect, pathname])

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
            onSelectionChange={(id) =>
              navigate(pathname.replace(clusterId, id as string) + search)
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
              value={dataSelect.filter}
              onChange={dataSelect.setFilter}
            />
            {dataSelect.namespaced && (
              <NamespaceFilter
                namespaces={namespaces}
                namespace={dataSelect.namespace}
                onChange={dataSelect.setNamespace}
              />
            )}
          </div>
        </div>
        <PageHeaderContext.Provider value={pageHeaderContext}>
          <DataSelect.Provider value={dataSelect}>
            <Outlet />
          </DataSelect.Provider>
        </PageHeaderContext.Provider>
      </div>
    </ResponsiveLayoutPage>
  )
}
