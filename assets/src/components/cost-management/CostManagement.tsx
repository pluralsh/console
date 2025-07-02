import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { Conjunction } from 'generated/graphql'
import { Dispatch, Key, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
  CM_CHART_VIEW_REL_PATH,
  CM_TABLE_VIEW_REL_PATH,
  COST_MANAGEMENT_ABS_PATH,
} from 'routes/costManagementRoutesConsts'
import styled from 'styled-components'

import { SubTabs } from 'components/utils/SubTabs'

export const CM_TREE_MAP_CARD_HEIGHT = 300

export type CMContextType = {
  tagKeysState: [Set<Key>, Dispatch<Set<Key>>]
  tagOpState: [Conjunction, Dispatch<Conjunction>]
}

const breadcrumbs = [
  { label: 'cost management', url: COST_MANAGEMENT_ABS_PATH },
]

const directory = [
  {
    label: 'Chart view',
    path: `${COST_MANAGEMENT_ABS_PATH}/${CM_CHART_VIEW_REL_PATH}`,
  },
  {
    label: 'Table view',
    path: `${COST_MANAGEMENT_ABS_PATH}/${CM_TABLE_VIEW_REL_PATH}`,
  },
]

export function CostManagement() {
  useSetBreadcrumbs(breadcrumbs)
  const tagKeysState = useState<Set<Key>>(new Set())
  const tagOpState = useState<Conjunction>(Conjunction.Or)

  const ctx: CMContextType = useMemo(
    () => ({ tagKeysState, tagOpState }),
    [tagKeysState, tagOpState]
  )

  return (
    <WrapperSC>
      <SubTabs directory={directory} />
      <Outlet context={ctx} />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  height: '100%',
  width: '100%',
  margin: 'auto',
  maxWidth: theme.breakpoints.desktopLarge,
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
}))
