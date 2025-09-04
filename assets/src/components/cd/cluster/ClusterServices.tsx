import {
  DeploymentIcon,
  ListIcon,
  NetworkInterfaceIcon,
} from '@pluralsh/design-system'
import { useEffect, useMemo } from 'react'
import { Outlet, useMatch, useParams, useSearchParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  CLUSTER_SERVICES_PATH,
  getClusterDetailsPath,
} from '../../../routes/cdRoutesConsts'
import { ButtonGroup } from '../../utils/ButtonGroup.tsx'
import { ModalMountTransition } from '../../utils/ModalMountTransition.tsx'
import {
  usePageHeaderContext,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'
import { DeployServiceModal } from '../services/deployModal/DeployService'
import { ServicesContextT } from '../services/Services'

import { useClusterContext } from './Cluster'

const directory = [
  { path: '', icon: <ListIcon />, tooltip: 'List view' },
  { path: 'tree', icon: <NetworkInterfaceIcon />, tooltip: 'Tree view' },
]

export default function ClusterServices() {
  const theme = useTheme()
  const { clusterId } = useParams()
  const pathMatch = useMatch(
    `${getClusterDetailsPath({ clusterId })}/${CLUSTER_SERVICES_PATH}/:tab`
  )
  const tab = pathMatch?.params?.tab || ''
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q')

  const {
    cluster,
    refetchServices: refetch,
    setRefetchServices: setRefetch,
  } = useClusterContext()

  const { setMoreMenuItems, menuKey, setMenuKey } = usePageHeaderContext()

  useSetPageHeaderContent(
    useMemo(
      () => (
        <div
          css={{
            display: 'flex',
            justifyContent: 'end',
            gap: theme.spacing.small,
          }}
        >
          <ButtonGroup
            directory={directory}
            toPath={(path) =>
              `${getClusterDetailsPath({ clusterId })}/${CLUSTER_SERVICES_PATH}/${path}`
            }
            tab={tab}
          />
        </div>
      ),
      [clusterId, tab, theme.spacing.small]
    )
  )

  useEffect(() => {
    setMoreMenuItems?.([
      {
        key: 'deploy',
        label: 'Deploy Service',
        icon: <DeploymentIcon />,
        enabled: true,
      },
    ])
  }, [setMoreMenuItems])

  const context: ServicesContextT = useMemo(
    () => ({
      setRefetch,
      clusterId,
      q,
      setQ: (newQ: string) => setSearchParams({ ...(newQ && { q: newQ }) }),
    }),
    [setRefetch, clusterId, q, setSearchParams]
  )

  return (
    <>
      <Outlet context={context} />
      <ModalMountTransition open={menuKey === 'deploy'}>
        <DeployServiceModal
          cluster={cluster}
          refetch={refetch}
          open={menuKey === 'deploy'}
          onClose={() => setMenuKey?.('')}
        />
      </ModalMountTransition>
    </>
  )
}
