import { sumBy } from 'lodash'

import {
  HttpConnection,
  Maybe,
  MetricResponse,
  MetricResult,
  Node,
} from '../generated/graphql'

import { cpuParser, memoryParser } from './kubernetes'

enum CapacityType {
  CPU,
  Memory,
  Pods,
}

type Capacity = { cpu?: string; pods?: string; memory?: string } | undefined

function avg(metrics: Array<MetricResult>): number | undefined {
  if (!metrics || metrics?.length === 0) return undefined

  return (
    metrics.reduce((acc, cur) => acc + (cpuParser(cur?.value) ?? 0), 0) /
      metrics.length ?? undefined
  )
}

function capacity(
  type: CapacityType,
  ...nodes: Array<Maybe<Node> | Node>
): number | null {
  if (nodes?.length === 0) {
    return null
  }

  switch (type) {
    case CapacityType.CPU:
      return sumBy(
        nodes,
        (node) => cpuParser((node?.status?.capacity as Capacity)?.cpu) ?? 0
      )
    case CapacityType.Memory:
      return sumBy(
        nodes,
        (n) => memoryParser((n?.status?.capacity as Capacity)?.memory) ?? 0
      )
    case CapacityType.Pods:
      return sumBy(nodes, (n) =>
        parseInt((n?.status?.capacity as Capacity)?.pods ?? '0')
      )
  }
}

function pods(pods: Array<MetricResult>): number {
  return parseInt(pods?.at(pods.length - 1)?.value ?? '0')
}

function toValues(
  metrics: Array<Maybe<MetricResponse>> | undefined | null
): Array<MetricResult> {
  if (!metrics || metrics?.length === 0) return []
  if (metrics.length > 1) throw new Error('expecting a single metric response')

  return (metrics.at(0)?.values ?? []) as Array<MetricResult>
}

function enabled(connection: Nullable<HttpConnection>): boolean {
  return !!connection && connection?.host?.length > 0
}

export const Prometheus = {
  // Functions
  avg,
  capacity,
  toValues,
  pods,
  enabled,
  // Types
  CapacityType,
}
