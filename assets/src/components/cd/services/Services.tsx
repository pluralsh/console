import {
  ListIcon,
  NetworkInterfaceIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'

import { Outlet, useMatch, useSearchParams } from 'react-router-dom'

import {
  CD_ABS_PATH,
  CD_REL_PATH,
  SERVICES_REL_PATH,
} from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'

import {
  Maybe,
  ServiceDeploymentStatus,
  ServiceStatusCountFragment,
} from '../../../generated/graphql'
import ButtonGroup from '../../utils/ButtonGroup.tsx'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'
import { DeployService } from './deployModal/DeployService'

import {
  ColActions,
  ColCluster,
  ColErrors,
  ColLastActivity,
  ColRef,
  ColRepo,
  ColServiceDeployment,
  ColStatus,
} from './ServicesColumns'
import { StatusTabKey } from './ServicesFilters'

export const columns = [
  ColServiceDeployment,
  ColCluster,
  ColRepo,
  ColRef,
  ColLastActivity,
  ColStatus,
  ColErrors,
  ColActions,
]

export function getServiceStatuses(
  serviceStatuses?: Maybe<Maybe<ServiceStatusCountFragment>[]>
): Record<StatusTabKey, number | undefined> {
  return {
    ALL: serviceStatuses?.reduce(
      (count, status) => count + (status?.count || 0),
      0
    ),
    [ServiceDeploymentStatus.Healthy]: serviceStatuses ? 0 : undefined,
    [ServiceDeploymentStatus.Synced]: serviceStatuses ? 0 : undefined,
    [ServiceDeploymentStatus.Stale]: serviceStatuses ? 0 : undefined,
    [ServiceDeploymentStatus.Paused]: serviceStatuses ? 0 : undefined,
    [ServiceDeploymentStatus.Failed]: serviceStatuses ? 0 : undefined,
    ...Object.fromEntries(
      serviceStatuses?.map((status) => [status?.status, status?.count]) || []
    ),
  }
}

export type ServicesContextT = {
  setRefetch?: (refetch: () => void) => void
  clusterId?: Nullable<string>
  setClusterId?: (clusterId: string) => void
}

const directory = [
  { path: '', icon: <ListIcon />, tooltip: 'List view' },
  { path: 'tree', icon: <NetworkInterfaceIcon />, tooltip: 'Tree view' },
]

export default function Services() {
  const theme = useTheme()
  const pathMatch = useMatch(`${CD_ABS_PATH}/${SERVICES_REL_PATH}/:tab`)
  const tab = pathMatch?.params?.tab || ''
  const [refetch, setRefetch] = useState(() => () => {})
  const [params, setParams] = useSearchParams()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'services',
          url: `/${CD_REL_PATH}/${SERVICES_REL_PATH}`,
        },
      ],
      []
    )
  )

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
            toPath={(path) => `/${CD_REL_PATH}/${SERVICES_REL_PATH}/${path}`}
            tab={tab}
          />
          <DeployService refetch={refetch} />
        </div>
      ),
      [refetch, tab, theme.spacing.small]
    )
  )

  const context: ServicesContextT = useMemo(
    () => ({
      setRefetch,
      clusterId: params.get('clusterId'),
      setClusterId: (clusterId: string) => setParams({ clusterId }),
    }),
    [setRefetch, params, setParams]
  )

  return <Outlet context={context} />
}
