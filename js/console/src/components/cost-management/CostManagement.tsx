import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { Conjunction } from 'generated/graphql'
import { Dispatch, Key, useMemo, useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  CM_CHART_VIEW_REL_PATH,
  CM_TABLE_VIEW_REL_PATH,
  COST_MANAGEMENT_ABS_PATH,
} from 'routes/costManagementRoutesConsts'
import styled from 'styled-components'

import { TagsFilter } from 'components/cd/services/ClusterTagsFilter'
import { PageColumnSC } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'

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
  const tab = useMatch(`${COST_MANAGEMENT_ABS_PATH}/:tab/*`)?.params.tab
  const tagKeysState = useState<Set<Key>>(new Set())
  const tagOpState = useState<Conjunction>(Conjunction.Or)

  const ctx: CMContextType = useMemo(
    () => ({ tagKeysState, tagOpState }),
    [tagKeysState, tagOpState]
  )

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={directory}
        activeFn={(path) => path === `${COST_MANAGEMENT_ABS_PATH}/${tab}`}
      >
        <TagsFilterWrapperSC>
          <TagsFilter
            small
            selectedTagKeys={tagKeysState[0]}
            setSelectedTagKeys={tagKeysState[1]}
            searchOp={tagOpState[0]}
            setSearchOp={tagOpState[1]}
          />
        </TagsFilterWrapperSC>
      </PageToolbar>
      <WrapperSC>
        {/*
          Padding lives on an inner wrapper (not the scrollport). Soft card
          shadows that paint into padding get clipped when padding is on the
          same element as overflow:auto — Chrome clips to the content edge.
        */}
        <InnerSC>
          <Outlet context={ctx} />
        </InnerSC>
      </WrapperSC>
    </PageColumnSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  flex: 1,
  minHeight: 0,
  width: '100%',
  maxWidth: theme.breakpoints.desktopLarge,
  alignSelf: 'center',
}))

const TagsFilterWrapperSC = styled.div({
  width: 400,
  minWidth: 200,
  flexShrink: 1,
})

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
