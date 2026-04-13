import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { SubTabs } from 'components/utils/SubTabs'
import { useMemo } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  WORKBENCHES_ALERTS_REL_PATH,
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_ISSUES_REL_PATH,
  WORKBENCHES_TOOLS_ADD_REL_PATH,
  WORKBENCHES_TOOLS_YOUR_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { getTabCrumb } from 'components/ai/AI'

const directory = [
  { label: 'Workbenches', path: '' },
  { label: 'Integrations', path: WORKBENCHES_TOOLS_ADD_REL_PATH },
  { label: 'Configured Tools', path: WORKBENCHES_TOOLS_YOUR_REL_PATH },
  { label: 'Alerts', path: WORKBENCHES_ALERTS_REL_PATH },
  { label: 'Issues', path: WORKBENCHES_ISSUES_REL_PATH },
]

export const getWorkbenchesBreadcrumbs = (tab: Nullable<string>) => [
  { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
  ...getTabCrumb(WORKBENCHES_ABS_PATH, tab),
]

export function Workbenches() {
  const { tab = '' } = useMatch(`${WORKBENCHES_ABS_PATH}/:tab`)?.params ?? {}

  useSetBreadcrumbs(useMemo(() => getWorkbenchesBreadcrumbs(tab), [tab]))
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
  gap: theme.spacing.large,
  padding: theme.spacing.large,
  minHeight: 0,
  height: '100%',
  width: '100%',
  maxWidth: theme.breakpoints.desktopLarge,
  alignSelf: 'center',
  overflow: 'auto',
}))
