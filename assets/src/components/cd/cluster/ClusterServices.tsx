import { Outlet, useMatch, useParams } from 'react-router-dom'

import { useMemo, useRef } from 'react'
import {
  ListIcon,
  NetworkInterfaceIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { LinkTabWrap } from '../../utils/Tabs'
import {
  CLUSTER_SERVICES_PATH,
  getClusterDetailsPath,
} from '../../../routes/cdRoutesConsts'
import { useSetPageHeaderContent } from '../ContinuousDeployment'

import { DeployService } from '../services/deployModal/DeployService'

import { ServicesContextT } from '../services/Services'

import { useClusterContext } from './Cluster'

const directory = [
  { path: '', label: 'Table', icon: <ListIcon /> },
  { path: 'tree', label: 'Tree', icon: <NetworkInterfaceIcon /> },
]

export default function ClusterServices() {
  const theme = useTheme()
  const { clusterId } = useParams()
  const pathMatch = useMatch(
    `${getClusterDetailsPath({ clusterId })}/${CLUSTER_SERVICES_PATH}/:tab`
  )
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)
  const tabStateRef = useRef<any>(null)

  const {
    cluster,
    refetchServices: refetch,
    setRefetchServices: setRefetch,
  } = useClusterContext()

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
          <TabList
            margin={1}
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: currentTab?.path,
            }}
          >
            {directory.map(({ path, label, icon }) => (
              <LinkTabWrap
                subTab
                key={path}
                textValue={label}
                to={`${getClusterDetailsPath({
                  clusterId,
                })}/${CLUSTER_SERVICES_PATH}/${path}`}
              >
                <SubTab
                  key={path}
                  textValue={label}
                  css={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: theme.spacing.small,
                  }}
                >
                  {icon} {label}
                </SubTab>
              </LinkTabWrap>
            ))}
          </TabList>
          <DeployService
            refetch={refetch}
            cluster={cluster}
          />
        </div>
      ),
      [cluster, clusterId, currentTab?.path, refetch, theme.spacing.small]
    )
  )
  const context = useMemo(
    () => ({ setRefetch, clusterId }) as ServicesContextT,
    [setRefetch, clusterId]
  )

  return <Outlet context={context} />
}
