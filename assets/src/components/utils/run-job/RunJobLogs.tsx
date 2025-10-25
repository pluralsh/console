import { useMemo, useState } from 'react'
import { FormField, ListBoxItem, Select } from '@pluralsh/design-system'
import {
  useSentinelRunJobK8sJobLogsQuery,
  useStackRunJobLogsQuery,
} from 'generated/graphql'
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
import { STACKS_PARAM_STACK } from 'routes/stacksRoutesConsts'

export function RunJobLogs() {
  const theme = useTheme()
  const params = useParams()
  const type = params[STACKS_PARAM_STACK] ? 'stack' : 'sentinel'
  const id = (type === 'stack' ? params.runId : params.jobId) ?? ''

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
    data: stackCurData,
    previousData: stackPrevData,
    error: stackError,
    loading: stackLoading,
    refetch: stackRefetch,
  } = useStackRunJobLogsQuery({
    skip: type !== 'stack',
    variables: { id, container: containers?.[0]?.name || '', sinceSeconds },
    notifyOnNetworkStatusChange: true,
  })

  const {
    data: sentinelCurData,
    previousData: sentinelPrevData,
    error: sentinelError,
    loading: sentinelLoading,
    refetch: sentinelRefetch,
  } = useSentinelRunJobK8sJobLogsQuery({
    skip: type !== 'sentinel',
    variables: { id, container: containers?.[0]?.name || '', sinceSeconds },
    notifyOnNetworkStatusChange: true,
  })
  const stackData = stackCurData || stackPrevData
  const sentinelData = sentinelCurData || sentinelPrevData

  const loading = type === 'stack' ? stackLoading : sentinelLoading
  const error = type === 'stack' ? stackError : sentinelError
  const refetch = type === 'stack' ? stackRefetch : sentinelRefetch

  const logs = useMemo(
    () =>
      (type === 'stack'
        ? stackData?.stackRun?.job?.logs || []
        : sentinelData?.sentinelRunJob?.job?.logs || []
      ).filter(isNonNullable),
    [type, stackData, sentinelData]
  )
  console.log(stackData, sentinelData, type, id)
  if (error) return <GqlError error={error} />

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
