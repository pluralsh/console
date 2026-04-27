import { Card, Flex, Input2, SearchIcon } from '@pluralsh/design-system'
import { useCallback, useMemo, useState } from 'react'

import { POLL_INTERVAL } from 'components/cluster/constants'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { LogFacetInput, useLogAggregationQuery } from 'generated/graphql'
import styled from 'styled-components'
import { toISOStringOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { logLevelToColor } from './LogLine'
import {
  DEFAULT_LOG_FILTERS,
  LogsDateDropdown,
  LogsFiltersT,
  LogsLabelsPicker,
  LogsQueryOperatorSelect,
  LogsSinceSecondsSelect,
} from './LogsFilters'
import { LogsLabels } from './LogsLabels'
import { LegendColor } from './LogsLegend'
import { LogsScrollIndicator } from './LogsScrollIndicator'
import { LogsTable } from './LogsTable'

export const DEFAULT_LOG_QUERY_LENGTH = 250

export function Logs({
  serviceId,
  clusterId,
}: {
  serviceId?: string
  clusterId?: string
}) {
  const { popToast } = useSimpleToast()

  const [labels, setLabels] = useState<LogFacetInput[]>([])
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 1000)
  const [filters, setFilters] = useState<LogsFiltersT>(DEFAULT_LOG_FILTERS)

  const [live, setLiveState] = useState(true)
  const setLive = useCallback(
    (live: boolean) => {
      setLiveState(live)
      if (live) setFilters({ ...filters, date: null })
    },
    [filters, setFilters]
  )

  const time = {
    before: live ? undefined : toISOStringOrUndef(filters.date, true),
    duration: secondsToDuration(filters.sinceSeconds),
    reverse: false,
  }

  const { data, loading, error, fetchMore } = useLogAggregationQuery({
    variables: {
      clusterId,
      serviceId,
      query: throttledQ,
      limit: filters.queryLength || DEFAULT_LOG_QUERY_LENGTH,
      time,
      facets: labels,
      operator: filters.queryOperator,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    pollInterval: live ? POLL_INTERVAL : 0,
    skip: !(clusterId || serviceId),
  })
  const initialLoading = !data && loading

  const logs = useMemo(
    () => data?.logAggregation?.filter(isNonNullable) ?? [],
    [data]
  )

  const addLabel = useCallback(
    (key: string, value: string) => {
      const alreadyAdded = labels.some((l) => l.key === key)
      if (!alreadyAdded) setLabels([...labels, { key, value }])
      popToast({
        prefix: 'Filter',
        name: key,
        action: alreadyAdded ? 'already added' : 'added',
        severity: alreadyAdded ? 'danger' : 'success',
        delayTimeout: 2000,
      })
    },
    [labels, popToast]
  )
  const removeLabel = useCallback(
    (key: string) => setLabels(labels.filter((l) => l.key !== key)),
    [labels, setLabels]
  )

  return (
    <MainContentWrapperSC>
      <Flex gap="small">
        <LogsQueryOperatorSelect
          operator={filters.queryOperator}
          setOperator={(queryOperator) =>
            setFilters({ ...filters, queryOperator })
          }
        />
        <Input2
          placeholder="Filter logs"
          startIcon={<SearchIcon size={14} />}
          value={q}
          onChange={({ target: { value } }) => setQ(value)}
          css={{ flexGrow: 1 }}
        />
        <LogsLabelsPicker
          logs={logs}
          clusterId={clusterId}
          serviceId={serviceId}
          query={throttledQ}
          time={time}
          addLabel={addLabel}
          selectedLabels={labels}
        />
      </Flex>
      <LogsLabels
        labels={labels}
        removeLabel={removeLabel}
      />
      {error ? (
        <GqlError error={error} />
      ) : (
        <Card
          height="100%"
          overflow="hidden"
          header={{
            size: 'large',
            headerProps: {
              style: { textTransform: 'none', overflow: 'visible' },
            },
            content: (
              <StretchedFlex>
                <Flex gap="small">
                  <LogsSinceSecondsSelect
                    sinceSeconds={filters.sinceSeconds}
                    setSinceSeconds={(sinceSeconds) =>
                      setFilters({ ...filters, sinceSeconds })
                    }
                  />
                  <LogsDateDropdown
                    initialDate={filters.date}
                    setDate={(date) => setFilters({ ...filters, date })}
                    setLive={setLive}
                  />
                </Flex>
                <LogsScrollIndicator
                  live={live}
                  setLive={setLive}
                />
              </StretchedFlex>
            ),
          }}
        >
          <LogsTable
            logs={logs}
            loading={loading}
            initialLoading={initialLoading}
            fetchMore={fetchMore}
            filters={filters}
            live={live}
            setLive={setLive}
            addLabel={addLabel}
            labels={labels}
            clusterId={clusterId}
            serviceId={serviceId}
          />
        </Card>
      )}
      <Flex gap="medium">
        {!(error || initialLoading) &&
          Object.entries(logLevelToColor).map(([level, color]) => (
            <Flex
              key={level}
              gap="xsmall"
              align="center"
            >
              <LegendColor color={color} />
              {level}
            </Flex>
          ))}
      </Flex>
    </MainContentWrapperSC>
  )
}

// convert seconds to ISO 8601 duration string
export const secondsToDuration = (seconds: number) => {
  return `PT${seconds}S`
}

const MainContentWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  width: '100%',
}))
