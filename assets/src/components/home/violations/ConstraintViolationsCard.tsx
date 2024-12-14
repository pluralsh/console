import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { GqlError } from 'components/utils/Alert'
import {
  PolicyAggregate,
  usePolicyConstraintsQuery,
  usePolicyStatisticsQuery,
} from 'generated/graphql'
import { useTheme } from 'styled-components'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { PoliciesTable } from 'components/security/policies/PoliciesTable'

import { HOME_CARD_MAX_HEIGHT } from '../HomeCard'

import { ConstraintViolationsChart } from './ConstraintViolationsChart'

export function ConstraintViolationsCard() {
  const theme = useTheme()
  const {
    data: tableData,
    loading,
    error: tableError,
    refetch,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: usePolicyConstraintsQuery,
    keyPath: ['policyConstraints'],
  })

  const { data: chartData, error: chartError } = usePolicyStatisticsQuery({
    variables: { aggregate: PolicyAggregate.Cluster },
    pollInterval: POLL_INTERVAL,
  })

  if (chartError) {
    return <GqlError error={chartError} />
  }
  if (tableError) {
    return <GqlError error={tableError} />
  }

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.large,
        maxHeight: HOME_CARD_MAX_HEIGHT,
      }}
    >
      <ConstraintViolationsChart data={chartData} />
      <div
        css={{
          display: 'flex',
          width: '100%',
        }}
      >
        <PoliciesTable
          caret
          fillLevel={1}
          data={tableData}
          loading={loading}
          refetch={refetch}
          fetchNextPage={fetchNextPage}
          setVirtualSlice={setVirtualSlice}
        />
      </div>
    </div>
  )
}
