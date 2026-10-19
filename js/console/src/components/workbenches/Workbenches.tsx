import { useSetBreadcrumbs } from '@pluralsh/design-system'
import {
  HeaderContext,
  PageHeaderContext,
} from 'components/cd/ContinuousDeployment'
import {
  PageColumnSC,
  PageRowSC,
  PageSidecarSlotContext,
  PageSidecarSlotSC,
} from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { ReactNode, useMemo, useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_EVALS_REL_PATH,
  WORKBENCHES_USAGE_REL_PATH,
  WORKBENCHES_TOOLS_ADD_REL_PATH,
  WORKBENCHES_TOOLS_YOUR_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { getTabCrumb } from 'utils/getTabCrumb'

const directory = [
  { label: 'Workbenches', path: '' },
  { label: 'Integrations', path: WORKBENCHES_TOOLS_ADD_REL_PATH },
  { label: 'Configured Tools', path: WORKBENCHES_TOOLS_YOUR_REL_PATH },
  { label: 'Evals', path: WORKBENCHES_EVALS_REL_PATH },
  { label: 'Usage', path: WORKBENCHES_USAGE_REL_PATH },
]

const tabs = directory.map(({ label, path }) => ({
  label,
  path: path ? `${WORKBENCHES_ABS_PATH}/${path}` : WORKBENCHES_ABS_PATH,
}))

export const getWorkbenchesBreadcrumbs = (tab: Nullable<string>) => [
  { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
  ...getTabCrumb(WORKBENCHES_ABS_PATH, tab),
]

export function Workbenches() {
  const { tab = '' } = useMatch(`${WORKBENCHES_ABS_PATH}/:tab`)?.params ?? {}
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [sidecarSlot, setSidecarSlot] = useState<HTMLDivElement | null>(null)
  const headerContext = useMemo(
    () => ({ setHeaderContent }) as HeaderContext,
    []
  )

  useSetBreadcrumbs(useMemo(() => getWorkbenchesBreadcrumbs(tab), [tab]))

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={tabs}
        activeFn={(path) =>
          path ===
          (tab ? `${WORKBENCHES_ABS_PATH}/${tab}` : WORKBENCHES_ABS_PATH)
        }
      >
        {headerContent}
      </PageToolbar>
      <PageRowSC>
        <WrapperSC>
          <PageHeaderContext.Provider value={headerContext}>
            <PageSidecarSlotContext value={sidecarSlot}>
              <Outlet />
            </PageSidecarSlotContext>
          </PageHeaderContext.Provider>
        </WrapperSC>
        <PageSidecarSlotSC ref={setSidecarSlot} />
      </PageRowSC>
    </PageColumnSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: theme.spacing.large,
  minHeight: 0,
  flex: 1,
  width: '100%',
  maxWidth: theme.breakpoints.desktopLarge,
  margin: '0 auto',
  overflow: 'auto',
}))
