import { A, Div, Flex } from 'honorable'
import {
  Button,
  TreeNav,
  TreeNavEntry,
  WrapWithIf,
  getBarePathFromPath,
  removeTrailingSlashes,
} from '@pluralsh/design-system'
import { useContext, useMemo, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { ensureURLValidity } from 'utils/url'
import { InstallationContext } from 'components/Installations'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { PropsContainer } from 'components/utils/PropsContainer'
import Prop from 'components/utils/Prop'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { Application, Repository, useRepositoryQuery } from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import capitalize from 'lodash/capitalize'
import {
  collectHeadings,
  getMdContent,
} from '@pluralsh/design-system/dist/markdoc'
import { useTheme } from 'styled-components'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import isEmpty from 'lodash/isEmpty'
import { config } from 'markdoc/mdSchema'

import { LoginContext } from '../../contexts'
import AppStatus from '../AppStatus'

import AppSelector from './AppSelector'
import RunbookStatus from './runbooks/runbook/RunbookStatus'
import LogsLegend from './logs/LogsLegend'
import ComponentProgress from './components/ComponentProgress'
import {
  DocPageContextProvider,
  useDocPageContext,
} from './docs/AppDocsContext'

export function getDocsData(docs: Repository['docs']) {
  return docs?.map((doc, i) => {
    const content = getMdContent(doc?.content, config)
    const headings = collectHeadings(content)
    const id = headings?.[0]?.id || `page-${i}`
    const label = headings?.[0]?.title || `Page ${i}`
    const path = `docs/${id}`

    const subpaths = headings
      .map((heading) => {
        if (heading.level === 3 && heading.id && heading.title) {
          return {
            path: `${path}#${heading.id}`,
            label: `${heading.title}`,
            id: heading.id,
            type: 'docPageHash',
          }
        }

        return null
      })
      .filter((heading) => !!heading)

    return {
      path,
      id,
      label,
      subpaths,
      content,
      headings,
      type: 'docPage',
    }
  })
}

const SYSTEM_APPS = [
  'bootstrap',
  'ingress-nginx',
  'monitoring',
  'postgres',
  'mysql',
]

export const getDirectory = ({
  app = null,
  docs = null,
  config = null,
}: {
  app: Application | null
  docs?: ReturnType<typeof getDocsData> | null
  config: any
}) => {
  if (!app || !docs) {
    return []
  }

  return [
    { path: 'dashboards', label: 'Dashboards', enabled: true },
    { path: 'runbooks', label: 'Runbooks', enabled: true },
    {
      path: 'components',
      label: <ComponentProgress app={app} />,
      enabled: true,
    },
    { path: 'logs', label: 'Logs', enabled: true },
    {
      path: 'cost',
      label: 'Cost analysis',
      enabled: app?.cost || app?.license,
    },
    { path: 'oidc', label: 'OpenID user management', enabled: true },
    {
      path: 'credentials',
      label: 'Credentials',
      enabled: true,
    },
    {
      path: 'config',
      label: 'Configuration',
      enabled: config?.gitStatus?.cloned,
    },
    {
      path: 'uninstall',
      label: 'Uninstall',
      enabled: !SYSTEM_APPS.includes(app.name),
    },
    {
      path: 'docs',
      label: `${capitalize(app?.name)} docs`,
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

function AppWithoutContext() {
  const theme = useTheme()
  const { me, configuration } = useContext<any>(LoginContext)
  const { pathname } = useLocation()
  const { appName, dashboardId, runbookName } = useParams()
  const { applications } = useContext<any>(InstallationContext)
  const [dashboard, setDashboard] = useState<any>()
  const [runbook, setRunbook] = useState<any>()
  const pathPrefix = `/apps/${appName}`
  const currentApp = applications.find((app) => app.name === appName)
  const { data: repoData, error: repoError } = useRepositoryQuery({
    variables: { name: appName ?? '' },
  })

  const docs = useMemo(
    () => getDocsData(repoData?.repository?.docs),
    [repoData?.repository?.docs]
  )

  const directory = useMemo(
    () =>
      getDirectory({ app: currentApp, docs, config: configuration }).filter(
        (entry) => entry.enabled
      ),
    [configuration, currentApp, docs]
  )

  if (!me || !currentApp) return null
  if (repoError) {
    return <GqlError error={repoError} />
  }
  if (!repoData?.repository) return <LoadingIndicator />

  const currentTab = directory.find((tab) =>
    pathname?.startsWith(`${pathPrefix}/${tab.path}`)
  )
  const {
    name,
    spec: {
      descriptor: { links, version },
    },
  } = currentApp
  const validLinks = links?.filter(({ url }) => !!url)

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <Flex
          flexDirection="column"
          maxHeight="100%"
          overflow="hidden"
        >
          <AppSelector
            directory={directory}
            applications={applications}
            currentApp={currentApp}
          />
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
        <Outlet context={{ setDashboard, setRunbook, docs }} />
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer>
        {validLinks?.length > 0 && (
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
        )}
        <Flex
          gap="medium"
          direction="column"
          marginTop={validLinks?.length > 0 ? 0 : 56}
        >
          <PropsContainer title="App">
            <Prop title="Current version">v{version}</Prop>
            <Prop title="Status">
              <AppStatus app={currentApp} />
            </Prop>
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
          {dashboardId && dashboard && (
            <PropsContainer title="Dashboard">
              <Prop title="Description">{dashboard.spec?.description}</Prop>
            </PropsContainer>
          )}
          {runbookName && runbook && (
            <PropsContainer title="Runbook">
              <Prop title="Description">{runbook.spec?.description}</Prop>
              <Prop title="Status">
                <RunbookStatus runbook={runbook} />
              </Prop>
            </PropsContainer>
          )}
          {currentTab?.path === 'logs' && <LogsLegend />}
        </Flex>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}

export default function App({ ...props }) {
  return (
    <DocPageContextProvider>
      <AppWithoutContext {...props} />
    </DocPageContextProvider>
  )
}
