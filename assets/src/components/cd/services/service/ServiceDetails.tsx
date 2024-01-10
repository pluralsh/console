import { useMemo } from 'react'
import {
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import {
  ServiceDeploymentDetailsFragment,
  useServiceDeploymentQuery,
  useServiceDeploymentsTinyQuery,
} from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import capitalize from 'lodash/capitalize'
import { useTheme } from 'styled-components'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import isEmpty from 'lodash/isEmpty'

import { mapExistingNodes } from 'utils/graphql'

import {
  DocPageContextProvider,
  useDocPageContext,
} from 'components/contexts/DocPageContext'
import { getDocsData } from 'components/apps/app/App'
import {
  CD_REL_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import ComponentProgress from 'components/apps/app/components/ComponentProgress'
import { SideNavEntries } from 'components/layout/SideNavEntries'

import { getClusterBreadcrumbs } from 'components/cd/cluster/Cluster'

import { POLL_INTERVAL } from 'components/cluster/constants'

import ServiceSelector from '../ServiceSelector'

import { ServiceDetailsSidecar } from './ServiceDetailsSidecar'

type ServiceContextType = {
  docs: ReturnType<typeof getDocsData>
  service: ServiceDeploymentDetailsFragment
}

export const useServiceContext = () => useOutletContext<ServiceContextType>()

export const getServiceDetailsBreadcrumbs = ({
  cluster,
  service,
}: Parameters<typeof getClusterBreadcrumbs>[0] & {
  service: { name?: Nullable<string>; id: string }
}) => [
  ...getClusterBreadcrumbs({ cluster }),
  { label: 'services', url: `${CD_REL_PATH}/services` },
  ...(service.id && cluster.id
    ? [
        {
          label: service?.name || service?.id,
          url: getServiceDetailsPath({
            clusterId: cluster.id,
            serviceId: service.id,
          }),
        },
      ]
    : []),
]

export const getDirectory = ({
  serviceDeployment,
  docs = null,
}: {
  serviceDeployment?: ServiceDeploymentDetailsFragment | null | undefined
  docs?: ReturnType<typeof getDocsData> | null
}) => {
  if (!serviceDeployment) {
    return []
  }
  const { name, componentStatus, helm } = serviceDeployment

  return [
    {
      path: 'components',
      label: <ComponentProgress componentsReady={componentStatus} />,
      enabled: true,
    },
    { path: 'settings', label: 'Settings', enabled: true },
    { path: 'secrets', label: 'Secrets', enabled: true },
    { path: 'helm', label: 'Helm values', enabled: !!helm },
    { path: 'revisions', label: 'Revisions', enabled: true },
    {
      path: 'docs',
      label: name ? `${capitalize(name)} docs` : 'Docs',
      enabled: !isEmpty(docs),
      ...(docs ? { subpaths: docs } : {}),
    },
  ]
}

function ServiceDetailsBase() {
  const theme = useTheme()
  const { pathname } = useLocation()
  const params = useParams()
  const serviceId = params[SERVICE_PARAM_ID] as string
  const clusterId = params[SERVICE_PARAM_CLUSTER_ID] as string
  const pathPrefix = getServiceDetailsPath({
    clusterId,
    serviceId,
  })
  const docPageContext = useDocPageContext()

  const { data: serviceListData } = useServiceDeploymentsTinyQuery({
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const serviceList = useMemo(
    () => mapExistingNodes(serviceListData?.serviceDeployments),
    [serviceListData?.serviceDeployments]
  )

  const { data: serviceData, error: serviceError } = useServiceDeploymentQuery({
    variables: { id: serviceId },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const { serviceDeployment } = serviceData || {}
  const docs = useMemo(
    () => getDocsData(serviceData?.serviceDeployment?.docs),
    [serviceData?.serviceDeployment?.docs]
  )

  const directory = useMemo(
    () =>
      getDirectory({
        serviceDeployment,
        docs,
      }).filter((entry) => entry.enabled),
    [docs, serviceDeployment]
  )

  return (
    <ResponsiveLayoutPage>
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
          {serviceList?.length > 1 && (
            <ServiceSelector serviceDeployments={serviceList} />
          )}
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
        {serviceError ? (
          <GqlError error={serviceError} />
        ) : serviceDeployment ? (
          <Outlet
            context={
              {
                docs,
                service: serviceDeployment,
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
