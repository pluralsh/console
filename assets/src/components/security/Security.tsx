import { Flex, SubTab } from '@pluralsh/design-system'
import { PageHeaderProvider } from 'components/cd/ContinuousDeployment'
import { useMemo, ReactNode, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import {
  POLICIES_REL_PATH,
  SECURITY_OVERVIEW_REL_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from 'routes/securityRoutesConsts'

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
        <Flex
          justifyContent="space-between"
          alignItems="center"
        >
          <Flex>
            {directory.map(({ path, label }) => (
              <SubTab
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
        </Flex>
        <Outlet />
      </WrapperSC>
    </PageHeaderProvider>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  margin: 'auto',
  maxWidth: 1280,
  gap: theme.spacing.large,
  padding: `${theme.spacing.large}px ${theme.spacing.xxlarge}px`,
}))
