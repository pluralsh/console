import { Flex, SubTab } from '@pluralsh/design-system'
import { PageHeaderProvider } from 'components/cd/ContinuousDeployment'
import { useMemo, ReactNode, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import {
  POLICIES_REL_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from 'routes/securityRoutesConsts'

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
            <SubTab
              active={route?.includes(POLICIES_REL_PATH)}
              onClick={() => {
                if (!route?.includes(POLICIES_REL_PATH)) {
                  navigate(`${POLICIES_REL_PATH}`)
                }
              }}
            >
              Policies
            </SubTab>
            <SubTab
              active={route?.includes(VULNERABILITY_REPORTS_REL_PATH)}
              onClick={() => {
                if (!route?.includes(VULNERABILITY_REPORTS_REL_PATH)) {
                  navigate(`${VULNERABILITY_REPORTS_REL_PATH}`)
                }
              }}
            >
              Vulnerability reports
            </SubTab>
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
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: `${theme.spacing.large}px ${theme.spacing.xxlarge}px`,
}))
