import { useEffect, useMemo, useState } from 'react'
import {
  EmptyState,
  FormField,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { useJobGateLogsQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { GqlError } from 'components/utils/Alert'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { ContainerLogsTable } from 'components/cd/cluster/pod/logs/ContainerLogs'

import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from 'components/cd/cluster/pod/logs/Logs'

import { isNonNullable } from 'utils/isNonNullable'

import { useJobPods } from './PipelineJob'

export default function PipelineJobLogs() {
  const theme = useTheme()
  const id = useParams().jobId!
  const pods = useJobPods()
  const containers = useMemo(
    () =>
      pods?.flatMap(
        (p) =>
          p?.spec?.containers?.map?.((c) => c?.name)?.filter(isNonNullable) ??
          []
      ) ?? [],
    [pods]
  )

  const [sinceSeconds, setSinceSeconds] = useState(SinceSecondsOptions.HalfHour)
  const [containerName, setContainerName] = useState<string>(
    containers?.[0] || ''
  )

  useEffect(() => {
    if (!containers?.includes(containerName)) {
      setContainerName(containers?.[0] || '')
    }
  }, [containerName, containers])

  const {
    data: currentData,
    previousData,
    error,
    loading,
    refetch,
  } = useJobGateLogsQuery({
    variables: {
      id,
      container: containerName || containers?.[0] || '',
      sinceSeconds,
    },
    notifyOnNetworkStatusChange: true,
  })
  const data = currentData || previousData

  const logs = useMemo(
    () => (data?.pipelineGate?.job?.logs || []).filter(isNonNullable),
    [data?.pipelineGate?.job?.logs]
  )

  if (isEmpty(containers)) {
    return <EmptyState message="No containers to view logs from" />
  }
  const content = error ? (
    <GqlError error={error} />
  ) : (
    <ContainerLogsTable
      logs={logs || []}
      loading={loading}
      refetch={refetch}
      container={containerName}
    />
  )

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
              label={
                isEmpty(containers) ? 'No containers' : 'Select a container'
              }
              isDisabled={isEmpty(containers)}
              selectedKey={containerName}
              onSelectionChange={(key) => setContainerName(key as string)}
            >
              {containers?.map((c) => (
                <ListBoxItem
                  key={c}
                  label={c}
                  textValue={c}
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
        {content}
      </div>
    </ScrollablePage>
  )
}
