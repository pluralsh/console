import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { getTabCrumb } from 'components/ai/AI'
import { SubTabs } from 'components/utils/SubTabs'
import { useMemo } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_TOOLS_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'

const directory = [
  { label: 'Workbenches', path: WORKBENCHES_ABS_PATH },
  { label: 'Tools', path: WORKBENCHES_TOOLS_REL_PATH },
]

export const getWorkbenchesBreadcrumbs = (tab: Nullable<string>) => [
  { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
  ...getTabCrumb(WORKBENCHES_ABS_PATH, tab),
]

export function Workbenches() {
  const { tab } = useMatch(`${WORKBENCHES_ABS_PATH}/:tab`)?.params ?? {}

  useSetBreadcrumbs(useMemo(() => getWorkbenchesBreadcrumbs(tab), [tab]))
  return (
    <WrapperSC>
      <SubTabs directory={directory} />
      <Outlet />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: theme.spacing.large,
  overflow: 'hidden',
  height: '100%',
  width: '100%',
  maxWidth: theme.breakpoints.desktopLarge,
  alignSelf: 'center',
}))
