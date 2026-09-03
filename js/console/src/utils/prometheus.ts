import { sumBy } from 'lodash'

import {
  ClusterNodeFragment,
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
    metrics.length
  )
}

function capacity(
  type: CapacityType,
  ...nodes: Array<Maybe<ClusterNodeFragment> | Node>
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

function format(value: number, type: 'cpu' | 'memory'): string {
  switch (type) {
    case 'cpu':
      return formatCPU(value)
    case 'memory':
      return formatMemory(value)
  }
}

// values is expected to be provided normalized to the cores base
function formatCPU(value: number): string {
  // Normalize from cores to the millicores base
  // 0.12 (cores) == 120 (millicores)
  value = value * 1000

  /** Base for prefixes */
  const coreBase = 1000

  /** Names of the suffixes where I-th name is for base^I suffix. */
  const corePowerSuffixes = ['m', '', 'k', 'M', 'G', 'T']

  let divider = 1
  let power = 0

  while (value / divider >= coreBase && power < corePowerSuffixes.length - 1) {
    divider *= coreBase
    power += 1
  }
  const decimals = value / divider < 1 ? 3 : 0
  return `${Number((value / divider).toFixed(decimals))}${corePowerSuffixes[power]}`
}

function formatMemory(value: number): string {
  /** Base for binary prefixes */
  const memoryBase = 1024

  /** Names of the suffixes where I-th name is for base^I suffix. */
  const memoryPowerSuffixes = ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi']

  let divider = 1
  let power = 0

  while (
    value / divider > memoryBase &&
    power < memoryPowerSuffixes.length - 1
  ) {
    divider *= memoryBase
    power += 1
  }

  return `${Number((value / divider).toFixed(0))}${memoryPowerSuffixes[power]}`
}

export const Prometheus = {
  // Functions
  avg,
  capacity,
  toValues,
  pods,
  enabled,
  format,
  // Types
  CapacityType,
}
