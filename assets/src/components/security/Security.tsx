import { Tab, TabList } from '@pluralsh/design-system'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { LinkTabWrap } from 'components/utils/Tabs'
import { ReactNode, useMemo, useRef, useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  COMPLIANCE_REPORTS_REL_PATH,
  GATEKEEPER_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_OVERVIEW_REL_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'

const directory = [
  { path: SECURITY_OVERVIEW_REL_PATH, label: 'Security overview' },
  { path: GATEKEEPER_REL_PATH, label: 'Gatekeeper' },
  { path: VULNERABILITY_REPORTS_REL_PATH, label: 'Vulnerability reports' },
  { path: COMPLIANCE_REPORTS_REL_PATH, label: 'Compliance reports' },
]

export function Security() {
  const tabStateRef = useRef<any>(null)
  const { tab } = useMatch(`${SECURITY_ABS_PATH}/:tab?/*`)?.params ?? {}
  const [headerContent, setHeaderContent] = useState<ReactNode>(null)
  const ctx = useMemo(() => ({ setHeaderContent }), [setHeaderContent])

  return (
    <PageHeaderContext value={ctx}>
      <ResponsiveLayoutPage>
        <ResponsiveLayoutSidenavContainer>
          <TabList
            stateRef={tabStateRef}
            stateProps={{ orientation: 'vertical', selectedKey: tab }}
            width="100%"
          >
            {directory.map(({ path, label }) => (
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
        <ContentSC>
          {headerContent}
          <Outlet />
        </ContentSC>
      </ResponsiveLayoutPage>
    </PageHeaderContext>
  )
}

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  gap: theme.spacing.large,
}))
