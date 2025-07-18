import { Chip, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { memo, Suspense, useMemo, useState } from 'react'
import {
  Outlet,
  useLocation,
  useMatch,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  ServiceDeploymentDetailsFragment,
  ServiceDeploymentQuery,
  useFlowQuery,
  useServiceDeploymentQuery,
} from 'generated/graphql'

import {
  DocPageContextProvider,
  useDocPageContext,
} from 'components/contexts/DocPageContext'
import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  CD_SERVICE_PATH_MATCHER_ABS,
  FLOW_SERVICE_PATH_MATCHER_ABS,
  getClusterDetailsPath,
  getServiceDetailsPath,
  SERVICE_COMPONENTS_PATH,
  SERVICE_PRS_PATH,
} from 'routes/cdRoutesConsts'

import { getClusterBreadcrumbs } from 'components/cd/cluster/Cluster'
import { POLL_INTERVAL } from 'components/cluster/constants'
import { Directory, SideNavEntries } from 'components/layout/SideNavEntries'

import {
  useLogsEnabled,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'

import { ServiceSelector } from '../ServiceSelector'

import { ApolloQueryResult } from '@apollo/client'
import { getFlowBreadcrumbs } from 'components/flows/flow/Flow'
import { InsightsTabLabel } from 'components/utils/AiInsights'
import { serviceStatusToSeverity } from '../ServiceStatusChip'
import { ServiceDetailsSidecar } from './ServiceDetailsSidecar'
import { useServicePersonaType } from './settings/ServiceSettings'

type ServiceContextType = {
  service: ServiceDeploymentDetailsFragment
  refetch: () => Promise<ApolloQueryResult<ServiceDeploymentQuery>>
  isRefetching: boolean
}

export const useServiceContext = () => useOutletContext<ServiceContextType>()

export const getServiceDetailsBreadcrumbs = ({
  cluster,
  service,
  flow,
  tab,
}: Parameters<typeof getClusterBreadcrumbs>[0] & {
  service: { name?: Nullable<string>; id: string }
  flow?: Nullable<{ name?: Nullable<string>; id: string }>
  tab?: string
}) => {
  const pathPrefix = getServiceDetailsPath({
    clusterId: cluster?.id,
    serviceId: service?.id,
    flowId: flow?.id,
  })
  return [
    ...(flow?.id
      ? getFlowBreadcrumbs(flow?.id, flow?.name ?? '', 'services')
      : [
          ...getClusterBreadcrumbs({ cluster }),
          {
            label: 'services',
            url: `${getClusterDetailsPath({ clusterId: cluster?.id })}/services`,
          },
        ]),
    ...(service?.id
      ? [{ label: service?.name || service?.id, url: pathPrefix }]
      : []),
    ...(service?.id && tab
      ? [{ label: tab, ...(tab !== 'pods' && { url: `${pathPrefix}/${tab}` }) }]
      : []),
  ]
}

export const DirLabelWithChip = memo(
  ({
    count,
    type,
  }: {
    count: Nullable<number>
    type: 'Error' | 'Alerts' | 'Recommendations'
  }) => {
    const severity =
      type === 'Error' ? ((count || 0) > 0 ? 'danger' : 'success') : 'neutral'
    return (
      <Flex gap="small">
        {type}
        <Chip
          size="small"
          severity={severity}
        >
          {count || 0}
        </Chip>
      </Flex>
    )
  }
)

export const getDirectory = ({
  serviceDeployment,
  logsEnabled = false,
  metricsEnabled = false,
  settingsEnabled = false,
}: {
  serviceDeployment?: ServiceDeploymentDetailsFragment | null | undefined
  logsEnabled?: boolean | undefined
  metricsEnabled?: boolean | undefined
  settingsEnabled?: boolean | undefined
}): Directory => {
  if (!serviceDeployment) return []

  const { componentStatus, dryRun, status } = serviceDeployment
  return [
    {
      path: SERVICE_COMPONENTS_PATH,
      label: (
        <Flex gap="small">
          Components
          <Chip
            size="small"
            severity={serviceStatusToSeverity(status)}
          >
            {componentStatus}
          </Chip>
        </Flex>
      ),
      enabled: true,
    },
    {
      path: 'errors',
      label: (
        <DirLabelWithChip
          count={serviceDeployment.errors?.length}
          type="Error"
        />
      ),
      enabled: true,
    },
    {
      path: 'alerts',
      label: (
        <DirLabelWithChip
          count={serviceDeployment.alerts?.edges?.length}
          type="Alerts"
        />
      ),
      enabled: true,
    },
    {
      path: 'recommendations',
      label: (
        <DirLabelWithChip
          count={serviceDeployment.scalingRecommendations?.length}
          type="Recommendations"
        />
      ),
      enabled: true,
    },
    {
      path: 'insights',
      label: <InsightsTabLabel insight={serviceDeployment.insight} />,
      enabled: !!serviceDeployment.insight,
    },
    { path: 'metrics', label: 'Metrics', enabled: metricsEnabled },
    { path: 'logs', label: 'Logs', enabled: logsEnabled },
    {
      path: 'network',
      label: 'Network',
      enabled:
        metricsEnabled &&
        !!serviceDeployment?.cluster?.operationalLayout?.serviceMesh,
    },
    { path: 'dryrun', label: 'Dry run', enabled: !!dryRun },
    { path: SERVICE_PRS_PATH, label: 'Pull requests', enabled: true },
    { path: 'settings', label: 'Settings', enabled: settingsEnabled },
  ]
}

function ServiceDetailsBase() {
  const theme = useTheme()
  const { pathname } = useLocation()
  const { serviceId, flowId } = useParams()
  const { tab } =
    useMatch(
      `${flowId ? FLOW_SERVICE_PATH_MATCHER_ABS : CD_SERVICE_PATH_MATCHER_ABS}/:tab?/*`
    )?.params ?? {}

  const personaType = useServicePersonaType()

  const [isRefetching, setIsRefetching] = useState(false)

  const {
    data: serviceData,
    error: serviceError,
    refetch,
  } = useServiceDeploymentQuery({
    variables: { id: serviceId ?? '' },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  })
  const { serviceDeployment } = serviceData ?? {}
  const clusterId = serviceDeployment?.cluster?.id

  const { data: flowData } = useFlowQuery({
    variables: { id: flowId ?? '' },
    skip: !flowId,
  })

  const pathPrefix = getServiceDetailsPath({
    flowId,
    clusterId,
    serviceId,
  })
  const docPageContext = useDocPageContext()
  const logsEnabled = useLogsEnabled()
  const metricsEnabled = useMetricsEnabled()

  const directory = useMemo(
    () =>
      getDirectory({
        serviceDeployment,
        logsEnabled,
        metricsEnabled,
        settingsEnabled: personaType !== 'no-settings',
      }),
    [logsEnabled, metricsEnabled, personaType, serviceDeployment]
  )

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getServiceDetailsBreadcrumbs({
          cluster: serviceDeployment?.cluster ?? { id: clusterId ?? '' },
          service: serviceDeployment ?? { id: serviceId ?? '' },
          flow: flowData?.flow,
          tab,
        }),
      ],
      [clusterId, flowData?.flow, serviceDeployment, serviceId, tab]
    )
  )

  return (
    <ResponsiveLayoutPage css={{ paddingBottom: theme.spacing.large }}>
      <ResponsiveLayoutSidenavContainer>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            rowGap: theme.spacing.medium,
            overflow: 'hidden',
            maxHeight: '100%',
          }}
        >
          <Suspense fallback={null}>
            <ServiceSelector />
          </Suspense>
          <div
            css={{
              overflowY: 'auto',
              paddingBottom: theme.spacing.medium,
            }}
          >
            <SideNavEntries
              directory={directory}
              pathname={pathname}
              pathPrefix={pathPrefix}
              docPageContext={docPageContext}
            />
          </div>
        </div>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer role="main">
        {!serviceDeployment && serviceError ? (
          <GqlError error={serviceError} />
        ) : serviceDeployment ? (
          <Outlet
            context={
              {
                service: serviceDeployment,
                refetch: () => {
                  setIsRefetching(true)
                  return refetch().finally(() => setIsRefetching(false))
                },
                isRefetching,
              } satisfies ServiceContextType
            }
          />
        ) : (
          <LoadingIndicator />
        )}
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer>
        <ServiceDetailsSidecar serviceDeployment={serviceDeployment} />
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}

export default function ServiceDetails({ ...props }) {
  return (
    <DocPageContextProvider>
      <ServiceDetailsBase {...props} />
    </DocPageContextProvider>
  )
}
