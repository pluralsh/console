import { Flex, Input, SearchIcon, Toast } from '@pluralsh/design-system'
import { LogsLabels } from 'components/cd/logs/LogsLabels'
import { useCallback, useState } from 'react'

import { useThrottle } from 'components/hooks/useThrottle'
import { LogFacetInput } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { LogsCard } from './LogsCard'
import { DEFAULT_LOG_FILTERS, LogsFilters, LogsFiltersT } from './LogsFilters'

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
  const [filters, setFilters] = useState<LogsFiltersT>(DEFAULT_LOG_FILTERS)

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
    <PageWrapperSC>
      <MainContentWrapperSC>
        <Flex gap="small">
          <Input
            placeholder="Filter logs"
            startIcon={<SearchIcon size={14} />}
            value={q}
            onChange={({ target: { value } }) => setQ(value)}
            flex={1}
          />
          <LogsFilters
            curFilters={filters}
            setCurFilters={setFilters}
          />
        </Flex>
        <LogsLabels
          labels={labels}
          removeLabel={removeLabel}
        />
        <LogsCard
          serviceId={serviceId}
          clusterId={clusterId}
          query={throttledQ}
          filters={filters}
          labels={labels}
          addLabel={addLabel}
          showLegendTooltip={showLegendTooltip}
        />
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
    </PageWrapperSC>
  )
}

// convert seconds to ISO 8601 duration string
export const secondsToDuration = (seconds: number) => {
  return `PT${seconds}S`
}

const PageWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.large,
  height: '100%',
  width: '100%',
}))

const MainContentWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
}))
