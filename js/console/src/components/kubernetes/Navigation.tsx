import { ReactNode, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

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
import { Directory, SideNavEntries } from '../layout/SideNavEntries'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'

import { Flex } from '@pluralsh/design-system'
import { DataSelectInputs } from './common/DataSelect'

export const NAMESPACE_PARAM = 'namespace'
export const FILTER_PARAM = 'filter'
export { LAST_SELECTED_CLUSTER_KEY } from './clusterSelection'

export default function Navigation() {
  const theme = useTheme()
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
          <ClusterSelector
            clusterId={clusterId}
            allowDeselect={false}
            hideTitleContent
            onClusterChange={(cluster) => {
              if (!cluster?.id || cluster.id === clusterId) return

              navigate(
                replaceKubernetesClusterId(pathname, clusterId, cluster.id)
              )
            }}
          />
          <SideNavEntries
            directory={directory}
            pathname={pathname}
            pathPrefix={pathPrefix}
          />
        </div>
      </ResponsiveLayoutSidenavContainer>
      <Flex
        direction="column"
        flex={1}
        height="100%"
        width="100%"
        minWidth={0}
      >
        {!pathname.includes(AUDIT_REL_PATH) && (
          <Flex
            justify="space-between"
            gap="small"
          >
            <div css={{ flex: 1, overflow: 'hidden' }}>{headerContent}</div>
            <div>{headerAction}</div>
            {!isObservabilityPath && <DataSelectInputs />}
          </Flex>
        )}
        <PageHeaderContext.Provider value={pageHeaderContext}>
          <Outlet />
        </PageHeaderContext.Provider>
      </Flex>
    </ResponsiveLayoutPage>
  )
}
