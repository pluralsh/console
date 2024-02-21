import { useMemo, useRef } from 'react'
import { Link, Outlet, useMatch, useParams } from 'react-router-dom'
import {
  Sidecar,
  SidecarItem,
  Tab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { A } from 'honorable'

import {
  SERVICE_POD_ABS_PATH,
  SERVICE_POD_PARAM_CLUSTER,
  SERVICE_POD_PARAM_NAME,
  SERVICE_POD_PARAM_NAMESPACE,
  SERVICE_POD_PARAM_SERVICE,
  getNodeDetailsPath,
  getServicePodDetailsPath,
} from '../../../../../routes/cdRoutesConsts'
import { usePodQuery } from '../../../../../generated/graphql'
import { LinkTabWrap } from '../../../../utils/Tabs'
import { podStatusToReadiness } from '../../../../../utils/status'
import { StatusChip } from '../../../../cluster/TableElements'
import LogsLegend from '../../../../apps/app/logs/LogsLegend'
import { getServiceDetailsBreadcrumbs } from '../ServiceDetails'

const DIRECTORY = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
  { path: 'logs', label: 'Logs' },
  { path: 'shell', label: 'Shell' },
]

export default function Pod() {
  const params = useParams()
  const clusterId = (params[SERVICE_POD_PARAM_CLUSTER] as string)!
  const serviceId = (params[SERVICE_POD_PARAM_SERVICE] as string)!
  const namespace = (params[SERVICE_POD_PARAM_NAMESPACE] as string)!
  const name = (params[SERVICE_POD_PARAM_NAME] as string)!
  const tabStateRef = useRef<any>()
  const theme = useTheme()
  const tab = useMatch(`${SERVICE_POD_ABS_PATH}/:tab`)?.params?.tab || ''
  const currentTab = DIRECTORY.find(({ path }) => path === tab)

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getServiceDetailsBreadcrumbs({
          cluster: { id: clusterId || '' }, // TODO: Use name if possible.
          service: { id: serviceId || '' }, // TODO: Use name if possible.
        }),
        { label: 'pods' },
        ...(serviceId && name && namespace
          ? [
              {
                label: name,
                url: getServicePodDetailsPath({
                  clusterId,
                  serviceId,
                  name,
                  namespace,
                }),
              },
              ...(tab ? [{ label: tab, url: '' }] : []),
            ]
          : []),
      ],
      [clusterId, serviceId, name, namespace, tab]
    )
  )

  const { data, error } = usePodQuery({
    variables: { name, namespace, serviceId },
    pollInterval: 10 * 1000,
    fetchPolicy: 'cache-and-network',
  })

  const pod = data?.pod
  const readiness = podStatusToReadiness(pod?.status)

  if (error) {
    return <GqlError error={error} />
  }
  if (!pod) {
    return <LoadingIndicator />
  }

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer paddingTop={40 + theme.spacing.medium}>
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
        as={<ResponsiveLayoutContentContainer overflow="visible" />}
        stateRef={tabStateRef}
      >
        <Outlet context={{ pod }} />
      </TabPanel>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer
        css={{
          gap: theme.spacing.medium,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Sidecar heading="Metadata">
          <SidecarItem heading="Pod name">{pod?.metadata?.name}</SidecarItem>
          <SidecarItem heading="Namespace">
            {pod?.metadata?.namespace}
          </SidecarItem>
          <SidecarItem heading="IP">{pod?.status?.podIp}</SidecarItem>
          <SidecarItem heading="Parent node">
            <A
              as={Link}
              to={getNodeDetailsPath({
                clusterId,
                name: pod?.spec.nodeName,
              })}
              inline
            >
              {pod?.spec.nodeName}
            </A>
          </SidecarItem>
          <SidecarItem heading="Service account">
            {pod?.spec.serviceAccountName}
          </SidecarItem>
          <SidecarItem heading="Status">
            <StatusChip readiness={readiness} />
          </SidecarItem>
        </Sidecar>
        {tab === 'logs' && <LogsLegend />}
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
