import { Flex, SubTab } from '@pluralsh/design-system'
import { PageHeaderProvider } from 'components/cd/ContinuousDeployment'
import { ReactNode, useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  POLICIES_REL_PATH,
  SECURITY_OVERVIEW_REL_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'

const directory = [
  { path: SECURITY_OVERVIEW_REL_PATH, label: 'Security overview' },
  { path: POLICIES_REL_PATH, label: 'Policies' },
  { path: VULNERABILITY_REPORTS_REL_PATH, label: 'Vulnerability reports' },
]

export function Security() {
  const navigate = useNavigate()
  const route = useParams()['*']
  const [headerContent, setHeaderContent] = useState<ReactNode>(null)
  const ctx = useMemo(() => ({ setHeaderContent }), [setHeaderContent])

  return (
    <PageHeaderProvider value={ctx}>
      <WrapperSC>
        <HeaderWrapperSC>
          <Flex>
            {directory.map(({ path, label }) => (
              <SubTab
                css={{ width: 'max-content' }}
                key={path}
                active={route?.includes(path)}
                onClick={() => {
                  if (!route?.includes(path)) navigate(`${path}`)
                }}
              >
                {label}
              </SubTab>
            ))}
          </Flex>
          {headerContent}
        </HeaderWrapperSC>
        <Outlet />
      </WrapperSC>
    </PageHeaderProvider>
  )
}

const HeaderWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  minHeight: 'fit-content',
  alignItems: 'center',
  gap: theme.spacing.medium,
  overflow: 'auto',
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
