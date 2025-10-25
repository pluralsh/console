import { useMemo, useState } from 'react'
import { FormField, ListBoxItem, Select } from '@pluralsh/design-system'
import { useStackRunJobLogsQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { GqlError } from 'components/utils/Alert'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { ContainerLogsTable } from 'components/cd/cluster/pod/logs/ContainerLogs'

import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from 'components/cd/cluster/pod/logs/Logs'

import { isNonNullable } from 'utils/isNonNullable'

import { useJobPods } from './RunJob'

export function RunJobLogs() {
  const theme = useTheme()
  const id = useParams().runId!
  const pods = useJobPods()
  const containers =
    useMemo(
      () =>
        pods?.flatMap(
          (p) =>
            p?.spec?.containers?.flatMap?.((c) => ({
              id: `${p.metadata.name}++${p.metadata.namespace}++${c?.name}`,
              ...c,
            })) ?? []
        ),
      [pods]
    ) || []

  const [sinceSeconds, setSinceSeconds] = useState(SinceSecondsOptions.HalfHour)
  const [selectedContainer, setSelectedContainer] = useState<string>(
    containers?.[0]?.name || ''
  )

  const {
    data: currentData,
    previousData,
    error,
    loading,
    refetch,
  } = useStackRunJobLogsQuery({
    variables: { id, container: containers?.[0]?.name || '', sinceSeconds },
    notifyOnNetworkStatusChange: true,
  })
  const data = currentData || previousData

  const logs = useMemo(
    () => (data?.stackRun?.job?.logs || []).filter(isNonNullable),
    [data?.stackRun?.job?.logs]
  )

  if (error) {
    return <GqlError error={error} />
  }

  return (
    <ScrollablePage
      heading="Logs"
      scrollable={false}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
          height: '100%',
        }}
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            '> *': { width: '100%' },
          }}
        >
          <FormField label="Container">
            <Select
              selectedKey={selectedContainer}
              onSelectionChange={(key) => setSelectedContainer(key as string)}
            >
              {containers?.map((c) => (
                <ListBoxItem
                  key={c.name || ''}
                  label={c.name || ''}
                  textValue={c.name || ''}
                />
              ))}
            </Select>
          </FormField>

          <FormField label="Logs since">
            <Select
              selectedKey={`${sinceSeconds}`}
              onSelectionChange={(key) =>
                setSinceSeconds(Number(key) as SinceSecondsOptions)
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
          </FormField>
        </div>
        <ContainerLogsTable
          logs={logs || []}
          loading={loading}
          refetch={refetch}
          container={selectedContainer}
        />
      </div>
    </ScrollablePage>
  )
}
