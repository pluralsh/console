import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { SubTabs } from 'components/utils/SubTabs'
import { useMemo } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  POLICIES_ABS_PATH,
  POLICIES_ATTACHMENT_RULES_REL_PATH,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'

const directory = [
  { label: 'Policies', path: '' },
  { label: 'Attachment rules', path: POLICIES_ATTACHMENT_RULES_REL_PATH },
]

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  { label: POLICIES_REL_PATH, url: POLICIES_ABS_PATH },
]

export function Policies() {
  const { tab = '' } = useMatch(`${POLICIES_ABS_PATH}/:tab`)?.params ?? {}

  useSetBreadcrumbs(useMemo(() => breadcrumbs, []))

  return (
    <WrapperSC>
      <SubTabs
        directory={directory}
        activeFn={(path) => path === tab}
      />
      <Outlet />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.large,
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  overflow: 'hidden',
}))
