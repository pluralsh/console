import { Input, ListBoxItem, SearchIcon, Select } from '@pluralsh/design-system'
import LogsLabels from 'components/cd/logs/LogsLabels'
import { toMap, useQueryParams } from 'components/utils/query'
import { useCallback, useState } from 'react'

import LogsLegend from 'components/cd/logs/LogsLegend'
import { Body2P } from 'components/utils/typography/Text'
import { clamp } from 'lodash'
import styled from 'styled-components'
import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from '../cluster/pod/logs/Logs'
import { LogsCard } from './LogsCard'

// convert seconds to ISO 8601 duration string
const secondsToDuration = (seconds: number) => {
  return `PT${seconds}S`
}

export function Logs({
  serviceId,
  clusterId,
}: {
  serviceId?: string | undefined
  clusterId?: string | undefined
}) {
  const query = useQueryParams()
  const [search, setSearch] = useState('')
  const [queryLength, setQueryLength] = useState(100)
  const [sinceSeconds, setSinceSeconds] = useState(
    SinceSecondsOptions.QuarterHour
  )
  const [labels, setLabels] = useState(toMap(query))

  const addLabel = useCallback(
    (name, value) => setLabels({ ...labels, [name]: value }),
    [labels, setLabels]
  )
  const removeLabel = useCallback(
    (name) => {
      const { [name]: _val, ...rest } = labels

      setLabels(rest)
    },
    [labels, setLabels]
  )

  const labelList = Object.entries(labels).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <PageWrapperSC>
      <MainContentWrapperSC>
        <FiltersWrapperSC>
          <Input
            placeholder="Filter logs"
            startIcon={<SearchIcon size={14} />}
            value={search}
            onChange={({ target: { value } }) => setSearch(value)}
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
            value={queryLength || ''}
            onChange={({ target: { value } }) =>
              setQueryLength(clamp(Number(value), 0, 1000))
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
          labels={labelList}
          removeLabel={removeLabel}
        />
        <LogsCard
          serviceId={serviceId}
          clusterId={clusterId}
          query={search}
          limit={queryLength}
          time={{
            // before: dayjs().toISOString(),
            before: '2025-01-14T00:45:06.037Z',
            duration: secondsToDuration(sinceSeconds),
          }}
          addLabel={addLabel}
        />
      </MainContentWrapperSC>
      <LogsLegend css={{ height: 'fit-content', width: 168 }} />
    </PageWrapperSC>
  )
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
