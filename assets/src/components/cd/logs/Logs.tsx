import {
  Input,
  ListBoxItem,
  SearchIcon,
  Select,
  Toast,
} from '@pluralsh/design-system'
import { LogsLabels } from 'components/cd/logs/LogsLabels'
import { useCallback, useMemo, useState } from 'react'

import { useThrottle } from 'components/hooks/useThrottle'
import { Body2P } from 'components/utils/typography/Text'
import { LogFacetInput } from 'generated/graphql'
import { clamp } from 'lodash'
import styled, { useTheme } from 'styled-components'
import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from '../cluster/pod/logs/Logs'
import { LogsCard } from './LogsCard'

const MAX_QUERY_LENGTH = 250

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
  const [sinceSeconds, setSinceSeconds] = useState(
    SinceSecondsOptions.QuarterHour
  )
  const [labels, setLabels] = useState<LogFacetInput[]>([])
  const [q, setQ] = useState('')
  const [queryLimit, setQueryLimit] = useState(100)
  const throttledQ = useThrottle(q, 1000)
  const throttledQueryLimit = useThrottle(queryLimit, 300)

  const time = useMemo(
    () => ({
      duration: secondsToDuration(sinceSeconds),
      reverse: false,
    }),
    [sinceSeconds]
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
    <PageWrapperSC>
      <MainContentWrapperSC>
        <FiltersWrapperSC>
          <Input
            placeholder="Filter logs"
            startIcon={<SearchIcon size={14} />}
            value={q}
            onChange={({ target: { value } }) => setQ(value)}
            flex={1}
          />
          <Input
            endIcon={<Body2P $color="text-xlight">lines</Body2P>}
            inputProps={{
              css: {
                textAlign: 'right',
                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                },
              },
            }}
            width={220}
            prefix="Query length"
            type="number"
            value={queryLimit || ''}
            onChange={({ target: { value } }) =>
              setQueryLimit(clamp(Number(value), 10, MAX_QUERY_LENGTH))
            }
          />
          <Select
            selectedKey={`${sinceSeconds}`}
            onSelectionChange={(key) =>
              setSinceSeconds(key as SinceSecondsOptions)
            }
          >
            {SinceSecondsSelectOptions.map((opts) => (
              <ListBoxItem
                key={`${opts.key}`}
                label={opts.label}
                selected={opts.key === sinceSeconds}
              />
            ))}
          </Select>
        </FiltersWrapperSC>
        <LogsLabels
          labels={labels}
          removeLabel={removeLabel}
        />
        <LogsCard
          serviceId={serviceId}
          clusterId={clusterId}
          query={throttledQ}
          limit={throttledQueryLimit}
          time={time}
          labels={labels}
          addLabel={addLabel}
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

const FiltersWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
}))

const MainContentWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
}))
