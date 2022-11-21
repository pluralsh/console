import { A, Flex } from 'honorable'
import {
  ArrowTopRightIcon,
  Button,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'

import { useContext, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { InstallationContext } from 'components/Installations'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { Prop, PropsContainer } from 'components/utils/props'

import { toAbsoluteURL } from 'utils/url'

import { ResponsiveLayoutSidenavContainer } from '../../layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from '../../layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from '../../layout/ResponsiveLayoutContentContainer'

import { LoginContext } from '../../contexts'

import AppStatus from '../AppStatus'

const DIRECTORY = [
  { path: 'dashboards', label: 'Dashboards' },
  { path: 'runbooks', label: 'Runbooks' },
  { path: 'components', label: 'Components' },
  { path: 'logs', label: 'Logs' },
  { path: 'config', label: 'Configuration' }, // path: '/config/{repo}', git: true
  //       {OPTIONS.map(({ text, icon, path, name: sbName, git }, ind) => {
    //         if (git && !conf.gitStatus.cloned) return null
    //       })}
  { path: 'cost', label: 'Cost analysis' },
]

export default function App() {
  const { me }: any = useContext(LoginContext)
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const { currentApplication }: any = useContext(InstallationContext)
  const pathPrefix = `/apps/${currentApplication.name}`
  const currentTab = DIRECTORY.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))

  if (!me || !currentApplication) return null

  const { name, spec: { descriptor: { links, version } } } = currentApplication
  const validLinks = links?.filter(({ url }) => !!url)

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding="large"
    >
      <ResponsiveLayoutSidenavContainer width={240}>
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            selectedKey: currentTab?.path,
          }}
        >
          {DIRECTORY.map(({ label, path }) => (
            <Tab
              key={path}
              as={Link}
              to={path}
              textDecoration="none"
            >
              {label}
            </Tab>
          ))}
        </TabList>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer />}
        stateRef={tabStateRef}
      >
        <Outlet />
      </TabPanel>
      <ResponsiveLayoutSidecarContainer width="200px">
        {validLinks?.length > 0 && (
          <Button
            small
            secondary
            fontWeight={600}
            marginVertical="small"
            endIcon={<ArrowTopRightIcon size={14} />}
            as="a"
            href={toAbsoluteURL(links[0].url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
          >
            Launch {name}
          </Button>
        )}
        <Flex
          gap="medium"
          direction="column"
          marginTop={validLinks?.length > 0 ? 0 : 56}
          paddingTop="xsmall"
        >
          <PropsContainer title="metadata">
            <Prop title="Current version">v{version}</Prop>
            <Prop title="Status"><AppStatus application={currentApplication} /></Prop>
            {validLinks?.length > 1 && (
              <Prop title="Other links">
                {validLinks.slice(1).map(({ url }) => (
                  <A
                    inline
                    href={toAbsoluteURL(url)}
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
        </Flex>
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
