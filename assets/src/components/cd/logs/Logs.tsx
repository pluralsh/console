import { Card, Flex, Toast } from '@pluralsh/design-system'
import { useCallback, useMemo, useState } from 'react'

import { POLL_INTERVAL } from 'components/cluster/constants'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { LogFacetInput, useLogAggregationQuery } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { toISOStringOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { logLevelToColor } from './LogLine'
import {
  DEFAULT_LOG_FILTERS,
  LogsDateDropdown,
  LogsFiltersT,
  LogsSearchInput,
  LogsSinceSecondsSelect,
} from './LogsFilters'
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
  const theme = useTheme()
  const [showErrorToast, setShowErrorToast] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const [labels, setLabels] = useState<LogFacetInput[]>([])
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 1000)
  const [filters, setFilters] = useState<LogsFiltersT>(DEFAULT_LOG_FILTERS)

  const [live, setLive] = useState(true)

  const { data, loading, error, fetchMore } = useLogAggregationQuery({
    variables: {
      clusterId,
      serviceId,
      query: throttledQ,
      limit: filters.queryLength || DEFAULT_LOG_QUERY_LENGTH,
      time: {
        before: live ? undefined : toISOStringOrUndef(filters.date, true),
        duration: secondsToDuration(filters.sinceSeconds),
        reverse: false,
      },
      facets: labels,
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
      if (!labels.some((l) => l.key === key)) {
        setLabels([...labels, { key, value }])
        setShowSuccessToast(true)
      } else {
        setShowErrorToast(true)
      }
    },
    [labels, setLabels]
  )
  const removeLabel = useCallback(
    (key: string) => {
      setLabels(labels.filter((l) => l.key !== key))
    },
    [labels, setLabels]
  )

  return (
    <>
      <MainContentWrapperSC>
        <LogsSearchInput
          q={q}
          setQ={setQ}
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
                      disabled={live}
                    />
                    <LogsDateDropdown
                      initialDate={filters.date}
                      setDate={(date) => setFilters({ ...filters, date })}
                      setLive={setLive}
                      disabled={live}
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
      <Toast
        severity="danger"
        position="bottom"
        show={showErrorToast}
        closeTimeout={1000}
        onClose={() => setShowErrorToast(false)}
        css={{ margin: theme.spacing.large }}
      >
        Label already added
      </Toast>
      <Toast
        severity="success"
        position="bottom"
        show={showSuccessToast}
        closeTimeout={1000}
        onClose={() => setShowSuccessToast(false)}
        css={{ margin: theme.spacing.large }}
      >
        Label added
      </Toast>
    </>
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
