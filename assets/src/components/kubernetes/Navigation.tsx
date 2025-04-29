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
  AUDIT_REL_PATH,
  CLUSTER_REL_PATH,
  CONFIGURATION_REL_PATH,
  CUSTOM_RESOURCES_REL_PATH,
  getKubernetesAbsPath,
  NETWORK_REL_PATH,
  RBAC_REL_PATH,
  STORAGE_REL_PATH,
  WORKLOADS_REL_PATH,
} from '../../routes/kubernetesRoutesConsts'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'
import { Directory, SideNavEntries } from '../layout/SideNavEntries'
import { ClusterSelect } from '../cd/utils/ClusterSelect'
import { PageHeaderContext } from '../cd/ContinuousDeployment'

import { useClusters } from './Cluster'
import {
  DataSelect,
  DataSelectInputs,
  useDataSelect,
} from './common/DataSelect'

export const NAMESPACE_PARAM = 'namespace'
export const FILTER_PARAM = 'filter'
export const LAST_SELECTED_CLUSTER_KEY = 'plural-last-selected-cluster'

const directory: Directory = [
  { path: WORKLOADS_REL_PATH, label: 'Workloads' },
  { path: NETWORK_REL_PATH, label: 'Network' },
  { path: STORAGE_REL_PATH, label: 'Storage' },
  { path: CONFIGURATION_REL_PATH, label: 'Configuration' },
  { path: RBAC_REL_PATH, label: 'RBAC' },
  { path: CLUSTER_REL_PATH, label: 'Cluster' },
  { path: CUSTOM_RESOURCES_REL_PATH, label: 'Custom resources' },
  { path: AUDIT_REL_PATH, label: 'Audit logs' },
] as const

export default function Navigation() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { clusterId = '' } = useParams()
  const clusters = useClusters()
  const [params, setParams] = useSearchParams()
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [headerAction, setHeaderAction] = useState<ReactNode>()
  const pathPrefix = getKubernetesAbsPath(clusterId)

  const dataSelect = useDataSelect({
    namespace: params.get(NAMESPACE_PARAM) ?? '',
    filter: params.get(FILTER_PARAM) ?? '',
  })

  const pageHeaderContext = useMemo(
    () => ({ setHeaderContent, setHeaderAction }),
    []
  )

  useLayoutEffect(() => {
    dataSelect.setEnabled(true)

    if (clusterId) sessionStorage.setItem(LAST_SELECTED_CLUSTER_KEY, clusterId)

    const newParams = new URLSearchParams()

    if (!isEmpty(dataSelect.filter))
      newParams.set(FILTER_PARAM, dataSelect.filter)

    if (!isEmpty(dataSelect.namespace))
      newParams.set(NAMESPACE_PARAM, dataSelect.namespace)

    if (newParams.toString() !== params.toString()) setParams(newParams)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSelect, pathname, clusterId])

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
            onSelectionChange={(id) => {
              dataSelect.setNamespace('')
              navigate(pathname.replace(clusterId, id as string) + search)
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
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          flexShrink: 1,
          height: '100%',
          width: '100%',
          minWidth: 0,
        }}
      >
        <div
          css={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing.small,
          }}
        >
          <div css={{ flex: 1, overflow: 'hidden' }}>{headerContent}</div>
          <div>{headerAction}</div>
          {dataSelect.enabled && <DataSelectInputs dataSelect={dataSelect} />}
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
