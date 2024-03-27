import { ReactElement, createContext, useMemo, useRef } from 'react'

import { SubTab, TabList } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { useMatch, useParams, useResolvedPath } from 'react-router-dom'

import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutHeader } from '../utils/layout/ResponsiveLayoutHeader'
import { LinkTabWrap } from '../utils/Tabs'
import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth'

import { ResponsiveLayoutSpacer } from '../utils/layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutSidecarContainer } from '../utils/layout/ResponsiveLayoutSidecarContainer'

import {
  ClusterTinyFragment,
  useClustersTinyQuery,
} from '../../generated/graphql'

import { mapExistingNodes } from '../../utils/graphql'

interface ResourceDetailsContextT {
  cluster?: ClusterTinyFragment // Currently selected cluster.
}

const ResourceDetailsContext = createContext<
  ResourceDetailsContextT | undefined
>(undefined)

export interface TabEntry {
  label: string
  path: string
}

interface ResourceDetailsProps {
  tabs: Array<TabEntry>
  sidecar: ReactElement
  children?: Array<ReactElement> | ReactElement
}

export default function ResourceDetails({
  tabs,
  sidecar,
  children,
}: ResourceDetailsProps): ReactElement {
  const theme = useTheme()
  const { clusterId } = useParams()
  const basePath = useResolvedPath('.')
  const pathMatch = useMatch(`${basePath.pathname}/:tab`)
  const tab = pathMatch?.params?.tab || ''
  const tabStateRef = useRef<any>(null)
  const currentTab = tabs.find(({ path }) => path === (tab ?? ''))

  const { data } = useClustersTinyQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
  })

  const clusters = useMemo(
    () => mapExistingNodes(data?.clusters),
    [data?.clusters]
  )

  const cluster = useMemo(
    () => clusters.find(({ id }) => id === clusterId),
    [clusterId, clusters]
  )

  const context = useMemo(
    () => ({ cluster }) as ResourceDetailsContextT,
    [cluster]
  )

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutPage
        css={{
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          paddingBottom: theme.spacing.large,

          '> div': {
            paddingLeft: 0,
            paddingTop: 0,
          },
        }}
      >
        <ResponsiveLayoutHeader
          css={{
            paddingRight: theme.spacing.xlarge,
            overflow: 'hidden',
          }}
        >
          <div
            css={{
              height: '100%',
              width: '100%',
              maxWidth: theme.breakpoints.desktopLarge,
              marginRight: 'auto',
              marginLeft: 'auto',
            }}
          >
            <TabList
              scrollable
              gap="xxsmall"
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: currentTab?.path,
              }}
              marginRight="medium"
              paddingBottom="xxsmall"
            >
              {tabs.map(({ label, path }) => (
                <LinkTabWrap
                  subTab
                  key={path}
                  textValue={label}
                  to={path}
                >
                  <SubTab
                    key={path}
                    textValue={label}
                  >
                    {label}
                  </SubTab>
                </LinkTabWrap>
              ))}
            </TabList>
          </div>
        </ResponsiveLayoutHeader>
        <ResponsivePageFullWidth
          noPadding
          maxContentWidth={theme.breakpoints.desktopLarge}
        >
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              gap: theme.spacing.large,
            }}
          >
            {children}
          </div>
        </ResponsivePageFullWidth>
      </ResponsiveLayoutPage>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer width={360}>
        {sidecar}
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
