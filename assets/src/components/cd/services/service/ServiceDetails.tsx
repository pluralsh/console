import { memo, useContext, useMemo } from 'react'
import {
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { Chip } from '@pluralsh/design-system'
import capitalize from 'lodash/capitalize'
import isEmpty from 'lodash/isEmpty'

import {
  ServiceDeploymentDetailsFragment,
  useServiceDeploymentQuery,
  useServiceDeploymentsTinyQuery,
} from 'generated/graphql'
import { mapExistingNodes } from 'utils/graphql'

import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  DocPageContextProvider,
  useDocPageContext,
} from 'components/contexts/DocPageContext'
import { getDocsData } from 'components/apps/app/App'
import {
  SERVICE_COMPONENTS_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
  SERVICE_PRS_PATH,
  getClusterDetailsPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'

import { Directory, SideNavEntries } from 'components/layout/SideNavEntries'
import { getClusterBreadcrumbs } from 'components/cd/cluster/Cluster'
import { POLL_INTERVAL } from 'components/cluster/constants'

import { useLogsEnabled } from 'components/contexts/DeploymentSettingsContext'

import { LoginContext } from 'components/contexts'

import FractionalChip from 'components/utils/FractionalChip'

import ServiceSelector from '../ServiceSelector'

import { useProjectId } from '../../../contexts/ProjectsContext'

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
  {
    label: 'services',
    url: `${getClusterDetailsPath({ clusterId: cluster.id })}/services`,
  },
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

const ErrorsLabelSC = styled.div(({ theme }) => ({
  display: 'flex',
  columnGap: theme.spacing.small,
}))

const ErrorsLabel = memo(({ count }: { count: Nullable<number> }) => (
  <ErrorsLabelSC>
    Errors
    <Chip
      size="small"
      severity={(count || 0) > 0 ? 'danger' : 'success'}
    >
      {count || 0}
    </Chip>
  </ErrorsLabelSC>
))

export const getDirectory = ({
  serviceDeployment,
  docs = null,
  logsEnabled = false,
  isAdmin = false,
}: {
  serviceDeployment?: ServiceDeploymentDetailsFragment | null | undefined
  docs?: ReturnType<typeof getDocsData> | null
  logsEnabled?: boolean | undefined
  isAdmin?: boolean
}): Directory => {
  if (!serviceDeployment) {
    return []
  }
  const { name, componentStatus, dryRun } = serviceDeployment

  const healthyDependencies =
    serviceDeployment.dependencies?.filter((dep) => dep?.status === 'HEALTHY')
      .length || 0
  const totalDependencies = serviceDeployment.dependencies?.length || 0

  return [
    {
      path: SERVICE_COMPONENTS_PATH,
      label: (
        <FractionalChip
          label="Components"
          fraction={componentStatus}
        />
      ),
      enabled: true,
    },
    {
      path: 'errors',
      label: <ErrorsLabel count={serviceDeployment.errors?.length} />,
      enabled: true,
    },
    { path: 'settings', label: 'Settings', enabled: true },
    { path: 'logs', label: 'Logs', enabled: logsEnabled },
    { path: 'secrets', label: 'Secrets', enabled: true },
    { path: 'helm', label: 'Helm values', enabled: isAdmin },
    { path: 'dryrun', label: 'Dry run', enabled: !!dryRun },
    { path: 'revisions', label: 'Revisions', enabled: true },
    { path: SERVICE_PRS_PATH, label: 'Pull requests', enabled: true },
    {
      path: 'docs',
      label: name ? `${capitalize(name)} docs` : 'Docs',
      enabled: !isEmpty(docs),
      ...(docs ? { subpaths: docs } : {}),
    },
    {
      path: 'dependencies',
      label: (
        <FractionalChip
          label="Dependencies"
          fraction={`${healthyDependencies}/${totalDependencies}`}
        />
      ),
      enabled: !isEmpty(serviceDeployment.dependencies),
    },
  ]
}

function ServiceDetailsBase() {
  const theme = useTheme()
  const { pathname } = useLocation()
  const { me } = useContext<any>(LoginContext)
  const isAdmin = !!me.roles?.admin
  const params = useParams()
  const projectId = useProjectId()
  const serviceId = params[SERVICE_PARAM_ID] as string
  const clusterId = params[SERVICE_PARAM_CLUSTER_ID] as string
  const pathPrefix = getServiceDetailsPath({
    clusterId,
    serviceId,
  })
  const docPageContext = useDocPageContext()
  const logsEnabled = useLogsEnabled()

  const { data: serviceListData } = useServiceDeploymentsTinyQuery({
    variables: { clusterId, projectId },
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
        logsEnabled,
        isAdmin,
      }),
    [docs, logsEnabled, serviceDeployment, isAdmin]
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
