import { Card, EmptyState } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import RangePicker from 'components/utils/RangePicker'

import { useServiceDeploymentComponentMetricsQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'

import { dayjsExtended as dayjs, DURATIONS } from 'utils/datetime'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

import { ComponentDetailsContext } from './ComponentDetails'
import {
  PodResourceReservation,
  getPodResourceReservations,
} from 'components/utils/metrics/podResourceReservations.ts'
import { ResourceMetricsGraphs } from 'components/utils/metrics/ResourceMetricsGraphs.tsx'
import { ComponentDetailsWithPodsT } from './useFetchComponentDetails.tsx'

type Duration = (typeof DURATIONS)[number]

function Metric({
  serviceId,
  componentId,
  podReservations,
  duration: { step, offset },
  ...props
}: {
  serviceId?: string
  componentId?: string
  podReservations?: PodResourceReservation[]
  duration: Duration
  maxHeight?: string
  overflowY?: string
}) {
  const theme = useTheme()
  const start = useMemo(
    () => dayjs().subtract(offset, 'second').toISOString(),
    [offset]
  )
  const { data, loading } = useServiceDeploymentComponentMetricsQuery({
    variables: {
      id: serviceId,
      componentId: componentId ?? '',
      step,
      start,
    },
    skip: !serviceId || !componentId,
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
  })

  const { cpu, mem, podCpu, podMem } = useMemo(() => {
    const { cpu, mem, podCpu, podMem } =
      data?.serviceDeployment?.componentMetrics || {}

    return {
      cpu: (cpu || []).filter(isNonNullable),
      mem: (mem || []).filter(isNonNullable),
      podCpu: (podCpu || []).filter(isNonNullable),
      podMem: (podMem || []).filter(isNonNullable),
    }
  }, [data])

  let content = <EmptyState message="No metrics available" />

  if (!isEmpty(cpu) || !isEmpty(mem) || !isEmpty(podCpu) || !isEmpty(podMem)) {
    content = (
      <ResourceMetricsGraphs
        cpu={cpu}
        mem={mem}
        podCpu={podCpu}
        podMem={podMem}
        podReservations={podReservations}
      />
    )
  }

  if (loading && !data) return <LoadingIndicator />

  return (
    <Card
      css={{
        padding: theme.spacing.medium,
        overflow: 'auto',
        gap: theme.spacing.small,
      }}
      {...props}
    >
      {content}
    </Card>
  )
}

export default function ComponentMetrics() {
  const theme = useTheme()
  const [duration, setDuration] = useState<Duration>(DURATIONS[0])
  const { component, componentDetails, serviceId } =
    useOutletContext<ComponentDetailsContext>()

  const podReservations = useMemo(
    () =>
      getPodResourceReservations(
        (componentDetails as ComponentDetailsWithPodsT)?.pods
      ),
    [componentDetails]
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <RangePicker
        duration={duration}
        setDuration={setDuration}
        position="sticky"
        top={0}
      />
      <Metric
        serviceId={serviceId}
        componentId={component?.id}
        podReservations={podReservations}
        duration={duration}
        maxHeight="100%"
        overflowY="auto"
      />
    </div>
  )
}
