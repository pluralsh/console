import { useMemo, useState } from 'react'
import {
  Banner,
  Button,
  FormField,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import {
  GateState,
  useForceGateMutation,
  useJobGateLogsQuery,
  useJobGateQuery,
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

import { useJobPods } from './PipelineJob'

export default function PipelineJobLogs() {
  const theme = useTheme()
  const id = useParams().jobId!
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
  const { data: jobGateData } = useJobGateQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const jobGateState = jobGateData?.pipelineGate?.state

  const [forceGate, { loading: loadingForceGate, error: errorForceGate }] =
    useForceGateMutation()
  const {
    data: currentData,
    previousData,
    error,
    loading,
    refetch,
  } = useJobGateLogsQuery({
    variables: { id, container: containers?.[0]?.name || '', sinceSeconds },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })
  const data = currentData || previousData

  const logs = useMemo(
    () => (data?.pipelineGate?.job?.logs || []).filter(isNonNullable),
    [data?.pipelineGate?.job?.logs]
  )

  if (error) {
    return <GqlError error={error} />
  }

  return (
    <ScrollablePage
      heading="Logs"
      scrollable={false}
      headingContent={
        jobGateState === GateState.Running ||
        jobGateState === GateState.Pending ? (
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.medium,
            }}
          >
            <Button
              disabled={loadingForceGate}
              onClick={() =>
                forceGate({
                  variables: {
                    id,
                    state: GateState.Open,
                  },
                })
              }
            >
              Mark Successful
            </Button>
            <Button
              disabled={loadingForceGate}
              secondary
              onClick={() =>
                forceGate({
                  variables: {
                    id,
                    state: GateState.Closed,
                  },
                })
              }
            >
              Cancel
            </Button>
          </div>
        ) : null
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
          height: '100%',
        }}
      >
        {errorForceGate && (
          <Banner
            heading="Error forcing gate"
            severity="error"
            position="fixed"
            top={80}
            right={50}
            zIndex={100}
          >
            {errorForceGate.message}
          </Banner>
        )}
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
