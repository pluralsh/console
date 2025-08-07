import { SubTab, TabList } from '@pluralsh/design-system'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { LinkTabWrap } from 'components/utils/Tabs'
import { ReactNode, useMemo, useRef, useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  COMPLIANCE_REPORTS_REL_PATH,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_OVERVIEW_REL_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'

const directory = [
  { path: SECURITY_OVERVIEW_REL_PATH, label: 'Security overview' },
  { path: POLICIES_REL_PATH, label: 'Policies' },
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
      <WrapperSC>
        <HeaderWrapperSC>
          <TabList
            scrollable
            stateRef={tabStateRef}
            stateProps={{ orientation: 'horizontal', selectedKey: tab }}
          >
            {directory.map(({ path, label }) => (
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
          {headerContent}
        </HeaderWrapperSC>
        <Outlet />
      </WrapperSC>
    </PageHeaderContext>
  )
}

const HeaderWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  minHeight: 'fit-content',
  alignItems: 'center',
  gap: theme.spacing.medium,
  overflow: 'hidden',
}))

const WrapperSC = styled.div(({ theme }) => ({
  height: '100%',
  width: '100%',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  margin: 'auto',
  maxWidth: 1280,
  gap: theme.spacing.large,
  padding: `${theme.spacing.large}px ${theme.spacing.xxlarge}px ${theme.spacing.medium}px`,
}))
