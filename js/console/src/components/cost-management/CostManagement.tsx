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
  { label: 'Chart view', path: CM_CHART_VIEW_REL_PATH },
  { label: 'Table view', path: CM_TABLE_VIEW_REL_PATH },
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
      {/*
        Padding lives on an inner wrapper (not the scrollport). Soft card
        shadows that paint into padding get clipped when padding is on the
        same element as overflow:auto — Chrome clips to the content edge.
      */}
      <InnerSC>
        <SubTabs directory={directory} />
        <Outlet context={ctx} />
      </InnerSC>
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
}))

const InnerSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  // Room for soft shadows outside cards (must not be on the overflow:auto node)
  padding: theme.spacing.large,
  ...(theme.mode === 'light' && {
    padding: theme.spacing.large + theme.spacing.small,
  }),
  minWidth: 0,
  boxSizing: 'border-box',
  width: '100%',
}))
