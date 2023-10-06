import { A, Div, Flex } from 'honorable'
import {
  TreeNav,
  TreeNavEntry,
  WrapWithIf,
  getBarePathFromPath,
  removeTrailingSlashes,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { ensureURLValidity } from 'utils/url'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { PropsContainer } from 'components/utils/PropsContainer'
import Prop from 'components/utils/Prop'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { useServiceDeploymentQuery } from 'generated/graphql'
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
import { CD_BASE_PATH, SERVICE_PARAM_NAME } from 'routes/cdRoutes'

// import AppSelector from './AppSelector'

export const getDirectory = ({
  name,
  docs = null,
}: {
  name?: string
  docs?: ReturnType<typeof getDocsData> | null
}) => {
  if (!name) {
    return []
  }

  return [
    {
      path: 'components',
      label: 'Component x/x',
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
  console.log('Service Details')
  const theme = useTheme()
  const { pathname } = useLocation()
  const serviceId = useParams()[SERVICE_PARAM_NAME] as string
  const pathPrefix = `/${CD_BASE_PATH}/services/${serviceId}`
  const { data: serviceData, error: serviceError } = useServiceDeploymentQuery({
    variables: { id: serviceId },
  })

  console.log('serviceName', serviceId)
  console.log('data', serviceData)

  const docs = useMemo(
    () => getDocsData(serviceData?.serviceDeployment?.docs),
    [serviceData?.serviceDeployment?.docs]
  )
  const { name, version } = serviceData?.serviceDeployment || {}

  const directory = useMemo(
    () =>
      getDirectory({
        name,
        docs,
      }).filter((entry) => entry.enabled),
    [docs, name]
  )

  if (serviceError) {
    return (
      <>
        serviceName:{serviceId}
        <GqlError error={serviceError} />
      </>
    )
  }
  if (!serviceData?.serviceDeployment) return <LoadingIndicator />

  //   const currentTab = directory.find(
  //     (tab) => pathname?.startsWith(`${pathPrefix}/${tab.path}`)
  //   )
  //   const validLinks = links?.filter(({ url }) => !!url)
  const validLinks = []

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <Flex
          flexDirection="column"
          maxHeight="100%"
          overflow="hidden"
        >
          {/* <AppSelector
            directory={directory}
            applications={applications}
            currentApp={currentApp}
          /> */}
          <Div
            overflowY="auto"
            paddingBottom={theme.spacing.medium}
          >
            <SideNavEntries
              directory={directory}
              pathname={pathname}
              pathPrefix={pathPrefix}
            />
          </Div>
        </Flex>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer role="main">
        <Outlet context={{ docs }} />
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer>
        {/* {validLinks?.length > 0 && (
          <Button
            secondary
            marginBottom="medium"
            as="a"
            href={ensureURLValidity(links[0].url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Launch {name}
          </Button>
        )} */}
        <Flex
          gap="medium"
          direction="column"
          marginTop={validLinks?.length > 0 ? 0 : 56}
        >
          <PropsContainer title="App">
            {version && (
              <Prop title="Current version">
                {version.startsWith('v') ? '' : 'v'}
                {version}
              </Prop>
            )}
            <Prop title="Status">{/* <AppStatus app={currentApp} /> */}</Prop>
            {validLinks?.length > 1 && (
              <Prop title="Other links">
                {validLinks.slice(1).map(({ url }) => (
                  <A
                    inline
                    href={ensureURLValidity(url)}
                    as="a"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {url}
                  </A>
                ))}
              </Prop>
            )}
          </PropsContainer>
          {/* {dashboardId && dashboard && (
            <PropsContainer title="Dashboard">
              <Prop title="Description">{dashboard.spec?.description}</Prop>
            </PropsContainer>
          )} */}
          {/* {runbookName && runbook && (
            <PropsContainer title="Runbook">
              <Prop title="Description">{runbook.spec?.description}</Prop>
              <Prop title="Status">
                <RunbookStatus runbook={runbook} />
              </Prop>
            </PropsContainer>
          )} */}
          {/* {currentTab?.path === 'logs' && <LogsLegend />} */}
        </Flex>
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
