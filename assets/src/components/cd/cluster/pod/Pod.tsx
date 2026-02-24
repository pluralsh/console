import {
  EmptyState,
  Tab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { GqlError } from 'components/utils/Alert'

import { getServiceDetailsBreadcrumbs } from 'components/cd/services/service/ServiceDetails.tsx'
import { getFlowBreadcrumbs } from 'components/flows/flow/Flow.tsx'
import {
  useAgentRunPodQuery,
  useClusterQuery,
  usePodQuery,
  useServiceDeploymentTinyQuery,
} from '../../../../generated/graphql'
import { useCurrentFlow } from 'components/flows/hooks/useCurrentFlow'
import { getPodDetailsPath } from '../../../../routes/cdRoutesConsts'
import { LinkTabWrap } from '../../../utils/Tabs'
import { LogsLegend } from '../../logs/LogsLegend.tsx'
import { getClusterBreadcrumbs } from '../Cluster'
import PodSidecar from './PodSidecar.tsx'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { getAgentRunBreadcrumbs } from 'components/ai/agent-runs/details/AIAgentRun.tsx'

const DIRECTORY = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
  { path: 'logs', label: 'Logs' },
  { path: 'shell', label: 'Shell' },
]

export default function Pod() {
  const theme = useTheme()
  const tabStateRef = useRef<any>(undefined)

  const {
    clusterId: clusterIdParam,
    serviceId,
    runId,
    name = '',
    namespace = '',
  } = useParams()
  const { flowIdOrName, flowData } = useCurrentFlow()
  const type = flowIdOrName
    ? 'flow'
    : serviceId
      ? 'service'
      : runId
        ? 'agent-run'
        : 'cluster'
  const tab =
    useMatch(
      `${getPodDetailsPath({ type, clusterId: clusterIdParam, serviceId, flowIdOrName, agentRunId: runId, name, namespace })}/:tab`
    )?.params?.tab || ''
  const currentTab = DIRECTORY.find(({ path }) => path === tab)

  const { data: serviceData } = useServiceDeploymentTinyQuery({
    variables: { id: serviceId ?? '' },
    skip: !serviceId,
  })
  const clusterId =
    clusterIdParam ?? serviceData?.serviceDeployment?.cluster?.id

  const { data: clusterData } = useClusterQuery({
    variables: { id: clusterId },
    skip: !clusterId,
  })
  const { data: agentRunData, loading: agentRunLoading } = useAgentRunPodQuery({
    variables: { id: runId ?? '' },
    skip: !runId,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...(type === 'flow'
          ? getFlowBreadcrumbs(flowData?.flow?.name, 'services')
          : type === 'service'
            ? getServiceDetailsBreadcrumbs({
                service: serviceData?.serviceDeployment ?? {
                  id: serviceId ?? '',
                },
                cluster: clusterData?.cluster,
                tab: 'pods',
              })
            : type === 'agent-run'
              ? getAgentRunBreadcrumbs(
                  runId ?? '',
                  agentRunData?.agentRun?.prompt ?? '',
                  'pods'
                )
              : getClusterBreadcrumbs({
                  cluster: clusterData?.cluster || { id: clusterId ?? '' },
                  tab: 'pods',
                })),
        ...(name && namespace
          ? [
              {
                label: name,
                url: getPodDetailsPath({
                  type,
                  clusterId,
                  serviceId,
                  flowIdOrName,
                  name,
                  namespace,
                }),
              },
              ...(tab ? [{ label: tab, url: '' }] : []),
            ]
          : []),
      ],
      [
        agentRunData?.agentRun?.prompt,
        clusterData?.cluster,
        clusterId,
        flowData?.flow?.name,
        flowIdOrName,
        name,
        namespace,
        runId,
        serviceData?.serviceDeployment,
        serviceId,
        tab,
        type,
      ]
    )
  )
  const { data, loading, error } = usePodQuery({
    variables: {
      name,
      namespace,
      ...(serviceId ? { serviceId } : clusterId ? { clusterId } : {}),
    },
    skip: !name || !namespace || !(serviceId || clusterId),
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const pod = type === 'agent-run' ? agentRunData?.agentRun?.pod : data?.pod

  if (error) return <GqlError error={error} />
  if (!pod)
    return !!(type === 'agent-run' ? agentRunLoading : loading) ? (
      <LoadingIndicator />
    ) : (
      <EmptyState
        message="Pod not found"
        description="Please check the pod name and namespace"
      />
    )

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer
        css={{ paddingTop: theme.spacing.medium }}
      >
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            selectedKey: currentTab?.path,
          }}
        >
          {DIRECTORY.map(({ label, path }) => (
            <LinkTabWrap
              key={path}
              textValue={label}
              to={path}
            >
              <Tab>{label}</Tab>
            </LinkTabWrap>
          ))}
        </TabList>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer css={{ overflow: 'visible' }} />}
        stateRef={tabStateRef}
      >
        <Outlet context={{ pod }} />
        {tab === 'logs' && (
          <div
            css={{
              padding: `${theme.spacing.small}px 0 ${theme.spacing.xlarge}px`,
            }}
          >
            <LogsLegend />
          </div>
        )}
      </TabPanel>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer
        css={{
          gap: theme.spacing.medium,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PodSidecar
          pod={pod}
          clusterId={clusterId}
        />
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
