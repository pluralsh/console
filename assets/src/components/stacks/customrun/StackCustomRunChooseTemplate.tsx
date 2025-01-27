import {
  CustomStackRunFragment,
  useCustomStackRunsQuery,
} from 'generated/graphql'

import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useMemo } from 'react'

import { mapExistingNodes } from 'utils/graphql'

import { CaretRightIcon, Table } from '@pluralsh/design-system'

import styled, { useTheme } from 'styled-components'

import { StackedText } from 'components/utils/table/StackedText'

import { StepName } from './StackCustomRunModal'

export function StackCustomRunChooseTemplate({
  stackId,
  setType,
  setStep,
  setSelectedCustomRun,
}: {
  stackId: string
  setType: (type: 'manual' | 'prebaked') => void
  setStep: (step: StepName) => void
  setSelectedCustomRun: (run: CustomStackRunFragment) => void
}) {
  const theme = useTheme()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useCustomStackRunsQuery,
        keyPath: ['infrastructureStack', 'customStackRuns'],
      },
      { id: stackId }
    )

  const customRuns = useMemo(
    () => mapExistingNodes(data?.infrastructureStack?.customStackRuns),
    [data?.infrastructureStack?.customStackRuns]
  )

  if (error) return <GqlError error={error} />
  if (!customRuns) return <LoadingIndicator />

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xsmall,
        overflow: 'hidden',
      }}
    >
      <Table
        fullHeightWrap
        virtualizeRows
        data={customRuns || []}
        columns={tableColumns}
        hideHeader
        padCells={false}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        css={{
          height: '100%',
        }}
        onRowClick={(_, { original }) => {
          setStep(StepName.Settings)
          setType('prebaked')
          setSelectedCustomRun(original)
        }}
      />

      <ManualOptionSC
        onClick={() => {
          setType('manual')
          setStep(StepName.Settings)
        }}
      >
        <span>Run commands manually</span>
        <CaretRightIcon />
      </ManualOptionSC>
    </div>
  )
}

const columnHelper = createColumnHelper<CustomStackRunFragment>()
const ColPreBakedRun = columnHelper.accessor((run) => run, {
  id: 'prebaked-run',
  meta: { gridTemplate: '100%' },
  cell: function Cell({ getValue }) {
    const run = getValue()
    const theme = useTheme()

    return (
      <PreBakedOptionSC>
        <StackedText
          first={run.name}
          second={run.documentation || 'highly'}
          truncate
        />
        <span css={{ display: 'flex', gap: theme.spacing.large }}>
          <CaretRightIcon />
        </span>
      </PreBakedOptionSC>
    )
  },
})

const tableColumns = [ColPreBakedRun]

const PreBakedOptionSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  height: '100%',
  width: '100%',
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  gap: theme.spacing.xxlarge,
  color: theme.colors.text,
  background: theme.colors['fill-two'],
  '&:hover': {
    background: theme.colors['fill-two-hover'],
  },
}))

const ManualOptionSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  cursor: 'pointer',
  border: theme.borders['fill-two'],
  background: theme.colors['fill-one'],
  borderRadius: theme.borderRadiuses.large,
  padding: `${theme.spacing.medium}px`,
  '&:hover': {
    background: theme.colors['fill-one-hover'],
  },
  ...theme.partials.text.body2LooseLineHeight,
}))
