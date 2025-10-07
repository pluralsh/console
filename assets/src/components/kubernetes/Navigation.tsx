import { ReactNode, useLayoutEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

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
import { PageHeaderContext } from '../cd/ContinuousDeployment'
import { ClusterSelect } from '../cd/utils/ClusterSelect'
import { Directory, SideNavEntries } from '../layout/SideNavEntries'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'

import { Flex } from '@pluralsh/design-system'
import { useClusters } from './Cluster'
import { DataSelectInputs, useDataSelect } from './common/DataSelect'

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
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [headerAction, setHeaderAction] = useState<ReactNode>()
  const pathPrefix = getKubernetesAbsPath(clusterId)

  const dataSelect = useDataSelect()

  const pageHeaderContext = useMemo(
    () => ({ setHeaderContent, setHeaderAction }),
    []
  )

  useLayoutEffect(() => {
    if (clusterId) sessionStorage.setItem(LAST_SELECTED_CLUSTER_KEY, clusterId)
  }, [pathname, clusterId])

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
              navigate(pathname.replace(clusterId, `${id}`) + search)
            }}
            withoutTitleContent
          />
          <SideNavEntries
            directory={directory}
            pathname={`${pathname}?${search}`}
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
            <DataSelectInputs />
          </Flex>
        )}
        <PageHeaderContext.Provider value={pageHeaderContext}>
          <Outlet />
        </PageHeaderContext.Provider>
      </Flex>
    </ResponsiveLayoutPage>
  )
}
