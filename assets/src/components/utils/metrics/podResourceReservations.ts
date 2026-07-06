import { getPodResources } from 'components/cd/cluster/pod/getPodResources.tsx'
import { Container, Maybe } from 'generated/graphql'
import { PodPod } from 'generated/kubernetes'

type OptionalMaybe<T> = Maybe<T> | undefined

export type PodResourceReservation = {
  pod: string
  cpu: {
    requests?: number
    limits?: number
  }
  memory: {
    requests?: number
    limits?: number
  }
}

type PodResourceSource = {
  metadata?: Maybe<{ name?: Maybe<string> }>
  objectMeta?: Maybe<{ name?: Maybe<string> }>
  spec?: Maybe<{ containers?: Maybe<Maybe<Container>[]> }>
  containers?: Maybe<Maybe<Container>[]>
}

type GraphPoint = {
  x: Date
  y: number
}

type GraphSeries = {
  id: string
  data: GraphPoint[]
}

function isNumber(value?: number): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

export function getPodResourceReservations(
  pods: OptionalMaybe<OptionalMaybe<PodResourceSource>[]>
): PodResourceReservation[] {
  return (pods ?? []).flatMap((pod) => {
    const podName = pod?.metadata?.name ?? pod?.objectMeta?.name
    const containers = pod?.spec?.containers ?? pod?.containers

    if (!podName) return []

    const { cpu, memory } = getPodResources(containers)

    return [
      {
        pod: podName,
        cpu: {
          requests: cpu.requests,
          limits: cpu.limits,
        },
        memory: {
          requests: memory.requests,
          limits: memory.limits,
        },
      },
    ]
  })
}

export function getPodResourceReservationsFromList(
  pods: PodPod[] | undefined
): PodResourceReservation[] {
  return (pods ?? []).flatMap((pod) => {
    const podName = pod?.objectMeta?.name
    const resources = pod?.allocatedResources

    if (!podName) return []

    return [
      {
        pod: podName,
        cpu: {
          requests: toOptionalResource(resources?.cpuRequests, 1000),
          limits: toOptionalResource(resources?.cpuLimits, 1000),
        },
        memory: {
          requests: toOptionalResource(resources?.memoryRequests),
          limits: toOptionalResource(resources?.memoryLimits),
        },
      },
    ]
  })
}

export function addPodResourceReservationSeries(
  graph: GraphSeries[],
  reservations: PodResourceReservation[] | undefined,
  type: 'cpu' | 'memory'
): GraphSeries[] {
  const reservationsByPod = new Map(
    reservations?.map((reservation) => [reservation.pod, reservation]) ?? []
  )

  return graph.flatMap((series) => {
    const pod = String(series.id)
    const podReservations = reservationsByPod.get(pod)?.[type]
    const resourceSeries = [
      toResourceSeries(
        `${pod} - requests`,
        podReservations?.requests,
        series.data
      ),
      toResourceSeries(`${pod} - limits`, podReservations?.limits, series.data),
    ].filter((series): series is GraphSeries => !!series)

    return [{ ...series, id: `${pod}` }, ...resourceSeries]
  })
}

function toResourceSeries(
  id: string,
  value: number | undefined,
  points: GraphPoint[]
): Nullable<GraphSeries> {
  if (!isNumber(value) || points.length === 0) return null

  return {
    id,
    data: points.map(({ x }) => ({ x, y: value })),
  }
}

function toOptionalResource(
  value: number | undefined,
  divisor = 1
): number | undefined {
  if (!isNumber(value) || value <= 0) return undefined

  return value / divisor
}
