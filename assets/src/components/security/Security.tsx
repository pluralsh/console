import { Flex, SubTab } from '@pluralsh/design-system'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { LinkTabWrap } from 'components/utils/Tabs'
import { ReactNode, useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  COMPLIANCE_REPORTS_REL_PATH,
  POLICIES_REL_PATH,
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
  const navigate = useNavigate()
  const route = useParams()['*']
  const [headerContent, setHeaderContent] = useState<ReactNode>(null)
  const ctx = useMemo(() => ({ setHeaderContent }), [setHeaderContent])

  return (
    <PageHeaderContext value={ctx}>
      <WrapperSC>
        <HeaderWrapperSC>
          <Flex>
            {directory.map(({ path, label }) => (
              <LinkTabWrap
                key={path}
                to={path}
                textValue={label}
                active={route?.includes(path)}
              >
                <SubTab
                  css={{ width: 'max-content' }}
                  onClick={() => {
                    if (!route?.includes(path)) navigate(`${path}`)
                  }}
                >
                  {label}
                </SubTab>
              </LinkTabWrap>
            ))}
          </Flex>
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
