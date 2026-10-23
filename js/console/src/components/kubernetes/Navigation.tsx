import { ReactNode, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'

import {
  AUDIT_REL_PATH,
  CLUSTER_REL_PATH,
  CONFIGURATION_REL_PATH,
  CUSTOM_RESOURCES_REL_PATH,
  getKubernetesAbsPath,
  LOGS_REL_PATH,
  METRICS_REL_PATH,
  NETWORK_REL_PATH,
  RBAC_REL_PATH,
  replaceKubernetesClusterId,
  STORAGE_REL_PATH,
  WORKLOADS_REL_PATH,
} from '../../routes/kubernetesRoutesConsts'
import { PageHeaderContext } from '../cd/ContinuousDeployment'
import {
  useLogsEnabled,
  useMetricsEnabled,
} from '../contexts/DeploymentSettingsContext'
import ClusterSelector from '../cd/utils/ClusterSelector'
import {
  PageContentSC,
  PageSidebarHeaderSC,
  PageSidebarSC,
  PageWithSidebar,
} from '../layout/PageLayout'
import { PageToolbar } from '../layout/PageToolbar'
import { PageSidebarNav } from '../layout/PageSidebarNav'
import { Directory } from '../layout/SideNavEntries'

import { DataSelectInputs } from './common/DataSelect'

export const NAMESPACE_PARAM = 'namespace'
export const FILTER_PARAM = 'filter'
export { LAST_SELECTED_CLUSTER_KEY } from './clusterSelection'

export default function Navigation() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { clusterId = '' } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const logsEnabled = useLogsEnabled()
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [headerAction, setHeaderAction] = useState<ReactNode>()
  const pathPrefix = getKubernetesAbsPath(clusterId)
  const isObservabilityPath = [METRICS_REL_PATH, LOGS_REL_PATH].some((path) =>
    pathname.startsWith(`${pathPrefix}/${path}`)
  )
  const showDataSelect =
    !isObservabilityPath && !pathname.includes(AUDIT_REL_PATH)

  const directory: Directory = useMemo(
    () => [
      { path: WORKLOADS_REL_PATH, label: 'Workloads' },
      { path: NETWORK_REL_PATH, label: 'Network' },
      { path: STORAGE_REL_PATH, label: 'Storage' },
      { path: CONFIGURATION_REL_PATH, label: 'Configuration' },
      { path: RBAC_REL_PATH, label: 'RBAC' },
      { path: CLUSTER_REL_PATH, label: 'Cluster' },
      { path: METRICS_REL_PATH, label: 'Metrics', enabled: metricsEnabled },
      { path: LOGS_REL_PATH, label: 'Logs', enabled: logsEnabled },
      { path: CUSTOM_RESOURCES_REL_PATH, label: 'Custom resources' },
      { path: AUDIT_REL_PATH, label: 'Audit logs' },
    ],
    [logsEnabled, metricsEnabled]
  )

  const pageHeaderContext = useMemo(
    () => ({ setHeaderContent, setHeaderAction }),
    []
  )

  return (
    <PageWithSidebar
      sidebar={
        <PageSidebarSC>
          <PageSidebarHeaderSC>
            <ClusterSelector
              clusterId={clusterId}
              allowDeselect={false}
              hideTitleContent
              inputProps={{ small: true }}
              onClusterChange={(cluster) => {
                if (!cluster?.id || cluster.id === clusterId) return

                navigate(
                  replaceKubernetesClusterId(pathname, clusterId, cluster.id)
                )
              }}
            />
          </PageSidebarHeaderSC>
          <PageSidebarNav
            directory={directory}
            pathPrefix={pathPrefix}
          />
        </PageSidebarSC>
      }
      toolbar={
        (headerContent || headerAction || showDataSelect) && (
          <PageToolbar start={headerContent}>
            {showDataSelect && <DataSelectInputs />}
            {headerAction}
          </PageToolbar>
        )
      }
    >
      <PageContentSC>
        <PageHeaderContext.Provider value={pageHeaderContext}>
          <Outlet />
        </PageHeaderContext.Provider>
      </PageContentSC>
    </PageWithSidebar>
  )
}
