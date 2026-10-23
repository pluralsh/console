import {
  ICON_FRAME_ICON_SIZE,
  DeploymentIcon,
  ListIcon,
  NetworkInterfaceIcon,
} from '@pluralsh/design-system'
import { useEffect, useMemo } from 'react'
import { Outlet, useMatch, useParams, useSearchParams } from 'react-router-dom'
import { ToolbarSearchInput } from 'components/layout/PageToolbar'

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
import { useServicesSearch } from '../services/ServicesFilters'

import { useClusterContext } from './Cluster'

const directory = [
  { path: '', icon: <ListIcon />, tooltip: 'List view' },
  { path: 'tree', icon: <NetworkInterfaceIcon />, tooltip: 'Tree view' },
]

export default function ClusterServices() {
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

  useEffect(() => {
    setMoreMenuItems?.([
      {
        key: 'deploy',
        label: 'Deploy Service',
        icon: <DeploymentIcon size={ICON_FRAME_ICON_SIZE.small} />,
        enabled: true,
      },
    ])
  }, [setMoreMenuItems])

  const context: ServicesContextT = useMemo(
    () => ({
      setRefetch,
      clusterId,
      q,
      setQ: (newQ: string) =>
        (newQ || null) !== q &&
        setSearchParams({ ...(newQ && { q: newQ }) }, { replace: true }),
    }),
    [setRefetch, clusterId, q, setSearchParams]
  )

  const [searchString, setSearchString] = useServicesSearch(
    context.q,
    context.setQ
  )

  useSetPageHeaderContent(
    useMemo(
      () => (
        <>
          {!tab && (
            <ToolbarSearchInput
              placeholder="Search services"
              value={searchString}
              onChange={setSearchString}
            />
          )}
          <ButtonGroup
            size="small"
            iconSize={ICON_FRAME_ICON_SIZE.small}
            directory={directory}
            toPath={(path) =>
              `${getClusterDetailsPath({ clusterId })}/${CLUSTER_SERVICES_PATH}/${path}`
            }
            tab={tab}
          />
        </>
      ),
      [clusterId, tab, searchString, setSearchString]
    )
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
