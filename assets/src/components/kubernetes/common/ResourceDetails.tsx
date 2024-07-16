import { ReactElement, ReactNode, useMemo, useRef, useState } from 'react'
import { SubTab, TabList } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useMatch, useResolvedPath } from 'react-router-dom'

import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage'
import { LinkTabWrap } from '../../utils/Tabs'
import { ResponsivePageFullWidth } from '../../utils/layout/ResponsivePageFullWidth'
import { ResponsiveLayoutSpacer } from '../../utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutSidecarContainer } from '../../utils/layout/ResponsiveLayoutSidecarContainer'
import { PageHeaderContext } from '../../cd/ContinuousDeployment'

export interface TabEntry {
  label: string
  path: string
}

interface ResourceDetailsProps {
  tabs: Array<TabEntry>
  additionalHeaderContent?: Array<ReactElement> | ReactElement
  sidecar: ReactElement
  children?: Array<ReactElement> | ReactElement
}

export default function ResourceDetails({
  tabs,
  additionalHeaderContent,
  sidecar,
  children,
}: ResourceDetailsProps): ReactElement {
  const theme = useTheme()
  const basePath = useResolvedPath('.')
  const pathMatch = useMatch(`${basePath.pathname}/:tab`)
  const tab = pathMatch?.params?.tab || ''
  const tabStateRef = useRef<any>(null)
  const currentTab = tabs.find(({ path }) => path === (tab ?? ''))
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const pageHeaderContext = useMemo(() => ({ setHeaderContent }), [])

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
        <header
          css={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing.small,
            marginBottom: theme.spacing.medium,
            paddingRight: theme.spacing.xlarge,
          }}
        >
          <div css={{ flex: 1, overflow: 'hidden' }}>
            <TabList
              scrollable
              gap="xxsmall"
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: currentTab?.path,
              }}
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
          {headerContent}
          {additionalHeaderContent}
        </header>
        <ResponsivePageFullWidth
          noPadding
          maxContentWidth={theme.breakpoints.desktopLarge}
        >
          <PageHeaderContext.Provider value={pageHeaderContext}>
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
          </PageHeaderContext.Provider>
        </ResponsivePageFullWidth>
      </ResponsiveLayoutPage>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer
        css={{
          width: 360,
          height: '100%',
          overflow: 'hidden',
          paddingBottom: theme.spacing.large,
        }}
      >
        <div css={{ height: '100%', overflowY: 'auto' }}>{sidecar}</div>
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
