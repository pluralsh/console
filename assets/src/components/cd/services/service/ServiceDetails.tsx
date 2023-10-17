import {
  TreeNav,
  TreeNavEntry,
  WrapWithIf,
  getBarePathFromPath,
  removeTrailingSlashes,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
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

import {
  DocPageContextProvider,
  useDocPageContext,
} from 'components/contexts/DocPageContext'

import { getDocsData } from 'components/apps/app/App'

import {
  CD_BASE_PATH,
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_ID,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import ComponentProgress from 'components/apps/app/components/ComponentProgress'

import { mapExistingNodes } from 'utils/graphql'

import { CD_BASE_CRUMBS } from 'components/cd/ContinuousDeployment'

import ServiceSelector from '../ServiceSelector'

import { ServiceDetailsSidecar } from './ServiceDetailsSidecar'

export const getServiceDetailsBreadcrumbs = ({
  clusterName,
  serviceId,
  serviceName,
}: {
  clusterName: string | null | undefined
  serviceId: string | null | undefined
  serviceName?: string | null | undefined
}) => [
  ...CD_BASE_CRUMBS,
  { label: 'services', url: `${CD_BASE_PATH}/services` },
  ...(clusterName && serviceId
    ? [
        {
          label: clusterName,
          url: `/${CD_BASE_PATH}/services/${clusterName}`,
        },
        {
          label: serviceName || serviceId,
          url: getServiceDetailsPath({ clusterName, serviceId }),
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
  const { name, componentStatus } = serviceDeployment

  return [
    {
      path: 'components',
      label: <ComponentProgress componentsReady={componentStatus} />,
      enabled: true,
    },
    { path: 'secrets', label: 'Secrets', enabled: true },
    {
      path: 'docs',
      label: name ? `${capitalize(name)} docs` : 'Docs',
      enabled: !isEmpty(docs),
      ...(docs ? { subpaths: docs } : {}),
    },
  ]
}

function SideNavEntries({
  directory,
  pathname,
  pathPrefix,
  root = true,
}: {
  directory: any[]
  pathname: string
  pathPrefix: string
  root?: boolean
}) {
  const docPageContext = useDocPageContext()

  return (
    <WrapWithIf
      condition={root}
      wrapper={<TreeNav />}
    >
      {directory.map(({ label, path, subpaths, type, ...props }) => {
        const currentPath =
          removeTrailingSlashes(getBarePathFromPath(pathname)) || ''
        const fullPath = `${pathPrefix}/${removeTrailingSlashes(path) || ''}`
        const hashlessPath = fullPath.split('#')[0]
        const isInCurrentPath = currentPath.startsWith(hashlessPath)
        const docPageRootHash = props?.headings?.[0]?.id || ''
        const active =
          type === 'docPage'
            ? isInCurrentPath &&
              (docPageContext.selectedHash === docPageRootHash ||
                !docPageContext.selectedHash)
            : type === 'docPageHash'
            ? isInCurrentPath && docPageContext.selectedHash === props.id
            : isInCurrentPath

        return (
          <TreeNavEntry
            key={fullPath}
            href={path === 'docs' ? undefined : fullPath}
            label={label}
            active={active}
            {...(type === 'docPageHash' && props.id
              ? {
                  onClick: () => {
                    docPageContext.scrollToHash(props.id)
                  },
                }
              : type === 'docPage'
              ? {
                  onClick: () => {
                    docPageContext.scrollToHash(docPageRootHash)
                  },
                }
              : {})}
          >
            {subpaths ? (
              <SideNavEntries
                directory={subpaths}
                pathname={pathname}
                pathPrefix={pathPrefix}
                root={false}
              />
            ) : null}
          </TreeNavEntry>
        )
      })}
    </WrapWithIf>
  )
}

function ServiceDetailsBase() {
  const theme = useTheme()
  const { pathname } = useLocation()
  const params = useParams()
  const serviceId = params[SERVICE_PARAM_ID] as string
  const clusterName = params[SERVICE_PARAM_CLUSTER] as string
  const pathPrefix = getServiceDetailsPath({
    clusterName,
    serviceId,
  })

  const { data: serviceListData } = useServiceDeploymentsTinyQuery()
  const serviceList = useMemo(
    () => mapExistingNodes(serviceListData?.serviceDeployments),
    [serviceListData?.serviceDeployments]
  )

  const { data: serviceData, error: serviceError } = useServiceDeploymentQuery({
    variables: { id: serviceId },
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
      }).filter((entry) => entry.enabled),
    [serviceDeployment]
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
            />
          </div>
        </div>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer role="main">
        {serviceError ? (
          <GqlError error={serviceError} />
        ) : serviceDeployment ? (
          <Outlet context={{ docs, service: serviceData?.serviceDeployment }} />
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
