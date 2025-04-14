import {
  Card,
  Flex,
  IconFrame,
  InfoOutlineIcon,
  Toast,
} from '@pluralsh/design-system'
import { useCallback, useMemo, useState } from 'react'

import { POLL_INTERVAL } from 'components/cluster/constants'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { LogFacetInput, useLogAggregationQuery } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { toISOStringOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import {
  DEFAULT_LOG_FLYOVER_FILTERS,
  LogsFilters,
  LogsFlyoverFiltersT,
} from './LogsFilters'
import LogsLegend from './LogsLegend'
import { LogsScrollIndicator } from './LogsScrollIndicator'
import { LogsTable } from './LogsTable'

export const DEFAULT_LOG_QUERY_LENGTH = 250

export function Logs({
  serviceId,
  clusterId,
  showLegendTooltip,
}: {
  serviceId?: string
  clusterId?: string
  showLegendTooltip?: boolean
}) {
  const theme = useTheme()
  const [showErrorToast, setShowErrorToast] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const [labels, setLabels] = useState<LogFacetInput[]>([])
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 1000)
  const [filters, setFilters] = useState<LogsFlyoverFiltersT>(
    DEFAULT_LOG_FLYOVER_FILTERS
  )

  const [live, setLiveState] = useState(true)

  const { data, loading, error, fetchMore, startPolling, stopPolling } =
    useLogAggregationQuery({
      variables: {
        clusterId,
        query: throttledQ,
        limit: filters.queryLength || DEFAULT_LOG_QUERY_LENGTH,
        serviceId,
        time: {
          before: live ? undefined : toISOStringOrUndef(filters.date, true),
          duration: secondsToDuration(filters.sinceSeconds),
          reverse: false,
        },
        facets: labels,
      },
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      skip: !(clusterId || serviceId),
    })

  const logs = useMemo(
    () => data?.logAggregation?.filter(isNonNullable) ?? [],
    [data]
  )

  const setLive = useCallback(
    (newVal: boolean) => {
      if (!newVal) stopPolling()
      else startPolling(POLL_INTERVAL)
      setLiveState(newVal)
    },
    [startPolling, stopPolling]
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
        <LogsFilters
          q={q}
          setQ={setQ}
          filters={filters}
          setFilters={setFilters}
          labels={labels}
          removeLabel={removeLabel}
          setLive={setLive}
        />
        {error ? (
          <GqlError error={error} />
        ) : (
          <Card
            height="100%"
            overflow="hidden"
            header={{
              size: 'large',
              content: (
                <Flex
                  width="100%"
                  justify="space-between"
                >
                  <LogsScrollIndicator
                    live={live}
                    setLive={setLive}
                  />
                  {showLegendTooltip && (
                    <IconFrame
                      icon={<InfoOutlineIcon color="icon-default" />}
                      tooltip={<LogsLegend />}
                      tooltipProps={{ placement: 'right' }}
                    />
                  )}
                </Flex>
              ),
            }}
          >
            <LogsTable
              logs={logs}
              loading={loading}
              initialLoading={!data && loading}
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
