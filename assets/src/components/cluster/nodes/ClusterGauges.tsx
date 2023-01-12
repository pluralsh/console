import {
  ReactNode,
  memo,
  useContext,
  useMemo,
} from 'react'
import { Flex, FlexProps } from 'honorable'
import { useQuery } from '@apollo/client'
import { Box, ThemeContext } from 'grommet'
import { memoryParser } from 'kubernetes-resource-parser'
import { filesize } from 'filesize'
import { sumBy } from 'lodash'
import { Doughnut } from 'react-chartjs-2'
import { normalizeColor } from 'grommet/utils'
import { Chart } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

import { MetricResponse, Node } from 'generated/graphql'
import { cpuParser } from 'utils/kubernetes'
import { PieChart } from 'components/utils/PieChart'

import styled, { useTheme } from 'styled-components'

import { ClusterMetrics as Metrics } from '../constants'
import { NODE_METRICS_Q } from '../queries'

import { cpuFmt, roundToTwoPlaces } from '../utils'

import { ResourceUsage } from './Nodes'

Chart.register(ChartDataLabels)

const ChartHeading = styled.h3(({ theme }) => ({
  ...theme.partials.text.caption,
  textAlign: 'center',
}))

function ChartWrap({
  children,
  heading,
  ...props
}: Omit<FlexProps, 'heading'> & { heading: ReactNode }) {
  return (
    <Flex
      flexDirection="column"
      overflow="visible"
      {...props}
    >
      <Flex
        width={140}
        height={140}
      >
        {children}
      </Flex>
      <ChartHeading>{heading}</ChartHeading>
    </Flex>
  )
}
type Capacity = { cpu?: string; pods?: string; memory?: string } | undefined

const datum = (data: MetricResponse[]) => (data[0]?.values?.[0]?.value ? parseFloat(data[0].values[0].value) : undefined)

export function ClusterGauges({
  nodes,
  usage,
}: {
  nodes: Node[]
  usage: ResourceUsage
}) {
  const theme = useTheme()

  const { data } = useQuery<{
    cpuRequests: MetricResponse[]
    cpuLimits: MetricResponse[]
    memRequests: MetricResponse[]
    memLimits: MetricResponse[]
    pods: MetricResponse[]
  }>(NODE_METRICS_Q, {
    variables: {
      cpuRequests: Metrics.CPURequests,
      cpuLimits: Metrics.CPULimits,
      memRequests: Metrics.MemoryRequests,
      memLimits: Metrics.MemoryLimits,
      pods: Metrics.Pods,
      offset: 5 * 60,
    },
    fetchPolicy: 'network-only',
    pollInterval: 5000,
  })

  console.log('req', data?.cpuRequests)

  const chartData = useMemo(() => {
    if (!data) {
      return null
    }
    const cpuRequests = datum(data.cpuRequests)
    const cpuLimits = datum(data.cpuLimits)
    const memRequests = datum(data.memRequests)
    const memLimits = datum(data.memLimits)
    const podsUsed = datum(data.pods)

    const chartColors = {
      used: theme.colors['text-danger-light'],
      available: theme.colors['icon-success'],
    } as const satisfies Record<string, string>

    const cpuTotal = sumBy(nodes,
      n => cpuParser((n?.status?.capacity as Capacity)?.cpu) ?? 0)
    const memTotal = sumBy(nodes, n => memoryParser((n?.status?.capacity as Capacity)?.memory))
    const podsTotal = sumBy(nodes, n => {
      const pods = (n?.status?.capacity as Capacity)?.pods

      return pods ? parseInt(pods) ?? 0 : 0
    })
    const { cpu: cpuUsed, mem: memUsed } = usage || {}

    return {
      cpuUsage: cpuUsed !== undefined && [
        { id: 'CPU used', value: cpuUsed, color: chartColors.used },
        {
          id: 'CPU remaining',
          value: cpuTotal - cpuUsed || 0,
          color: chartColors.available,
        },
      ],
      cpuRequests: cpuLimits !== undefined
        && cpuRequests !== undefined && [
        {
          id: 'CPU requests',
          value: cpuRequests,
          color: chartColors.used,
        },
        {
          id: 'CPU limits remaining',
          value: cpuLimits - cpuRequests,
          color: chartColors.available,
        },
      ],
      memoryUsage: memUsed !== undefined && [
        { id: 'Memory used', value: memUsed, color: chartColors.used },
        {
          id: 'Memory remaining',
          value: memTotal - memUsed,
          color: chartColors.available,
        },
      ],
      memoryRequests: memRequests !== undefined
        && memLimits !== undefined && [
        {
          id: 'Memory requests',
          value: memRequests || 0,
          color: chartColors.used,
        },
        {
          id: 'Memory limits remaining',
          value: memLimits - memRequests,
          color: chartColors.available,
        },
      ],
      podUsage: [
        {
          id: 'Pods used',
          value: podsUsed || 0,
          color: chartColors.used,
        },
        {
          id: 'Pods remaining',
          value: (podsTotal || 0) - (podsUsed || 0),
          color: chartColors.available,
        },
      ],
    }
  }, [data, nodes, theme.colors, usage])

  if (!chartData) {
    return null
  }

  return (
    <Flex
      flex={false}
      flexDirection="row"
      align="center"
      justifyContent="space-between"
      width="100%"
      gap="xsmall"
      marginBottom="xlarge"
      overflow="visible"
    >
      {chartData.cpuUsage && (
        <ChartWrap heading="CPU Utilization">
          <PieChart
            data={chartData.cpuUsage}
            valueFormat={val => cpuFmt(roundToTwoPlaces(val))}
          />
        </ChartWrap>
      )}
      {chartData.cpuRequests && (
        <ChartWrap heading="CPU Requests">
          <PieChart
            data={chartData.cpuRequests}
            valueFormat={val => cpuFmt(roundToTwoPlaces(val))}
          />
        </ChartWrap>
      )}
      {chartData.memoryUsage && (
        <ChartWrap heading="Memory Usage">
          <PieChart
            data={chartData.memoryUsage}
            valueFormat={val => filesize(roundToTwoPlaces(val)) as string}
          />
        </ChartWrap>
      )}
      {chartData.memoryRequests && (
        <ChartWrap heading="Memory Requests">
          <PieChart
            data={chartData.memoryRequests}
            valueFormat={val => filesize(roundToTwoPlaces(val)) as string}
          />
        </ChartWrap>
      )}
      {chartData.memoryRequests && (
        <ChartWrap heading="Pod Usage">
          <PieChart data={chartData.podUsage} />
        </ChartWrap>
      )}
      {/* <LayeredGauge
        usage={usage.cpu}
        requests={cpuRequests}
        limits={cpuLimits}
        total={cpuTotal}
        title="CPU Reservation"
        name="CPU"
        format={cpuFmt}
      />
      <LayeredGauge
        usage={usage.mem}
        requests={memRequests}
        limits={memLimits}
        total={memTotal}
        title="Memory Reservation"
        name="Mem"
        format={filesize}
      />
      <SimpleGauge
        value={podCount || undefined}
        total={podsTotal}
        title="Pod Usage"
        name="Pods"
      /> */}
    </Flex>
  )
}

export const SimpleGauge = memo(({
  value,
  total,
  title,
  name,
}: {
    value?: number
    total?: number
    title: string
    name: string
  }) => {
  const theme = useContext(ThemeContext)
  const val = value || 0
  const tot = total || 0

  return (
    <Box
      flex={false}
      height="200px"
      width="200px"
    >
      <Doughnut
        data={{
          labels: [` ${name}`, ` ${name} available`],
          datasets: [
            {
              label: name,
              data: [val, Math.max(tot - val, 0)],
              backgroundColor: [
                normalizeColor('success', theme),
                normalizeColor('cardDetailLight', theme),
              ],
              hoverOffset: 4,
              borderWidth: 0,
            },
          ],
        }}
        options={{
          cutout: '75%',
          animation: false,
          plugins: {
            legend: { display: false },
            title: { color: 'white', text: title, display: true },
          },
        }}
      />
    </Box>
  )
})

export const LayeredGauge = memo(({
  requests,
  limits,
  usage,
  total,
  title,
  name,
  format,
}: {
    requests: any
    limits: any
    usage: any
    total: any
    title: any
    name: any
    format: any
  }) => {
  const theme = useContext(ThemeContext)
  const data = useMemo(() => {
    const reqs = requests || 0
    const lims = limits || 0
    const tot = total || 0
    const used = roundToTwoPlaces(usage)

    return {
      labels: [
        `${name} requests`,
        `${name} remaining`,
        `${name} limits`,
        `${name} remaining`,
        `${name} used`,
        `${name} free`,
      ],
      datasets: [
        {
          labels: [`${name} requests`, `${name} available`],
          data: [reqs, Math.max(tot - reqs, 0)],
          backgroundColor: [
            normalizeColor('success', theme),
            normalizeColor('cardDetailLight', theme),
          ],
            // hoverOffset: 4,
          borderWidth: 0,
          hoverBorderWidth: 0,
        },
        {
          labels: [`${name} limits`, `${name} available`],
          data: [lims, Math.max(tot - lims, 0)],
          backgroundColor: [
            normalizeColor('blue', theme),
            normalizeColor('cardDetailLight', theme),
          ],
            // hoverOffset: 4,
          hoverBorderWidth: 0,
          borderWidth: 0,
        },
        {
          labels: [`${name} utilized`, `${name} available`],
          data: [used, Math.max(tot - used, 0)],
          backgroundColor: [
            normalizeColor('purple', theme),
            normalizeColor('cardDetailLight', theme),
          ],
            // hoverOffset: 4,
          hoverBorderWidth: 0,
          borderWidth: 0,
        },
      ],
    }
  }, [requests, limits, total, name, theme, usage])

  return (
    <Box
      flex={false}
      height="200px"
      width="200px"
    >
      <Doughnut
        data={data}
        options={{
          cutout: '70%',
          animation: false,
          plugins: {
            legend: { display: false },
            title: { color: 'white', text: title, display: true },
            datalabels: { formatter: format },
            tooltip: {
              callbacks: {
                label(context) {
                  const dataLabels = context?.chart?.data?.labels || []

                  const labelIndex
                      = context.datasetIndex * 2 + context.dataIndex

                  return ` ${dataLabels[labelIndex]}: ${format(context.raw)}`
                },
              },
            },
          },
        }}
      />
    </Box>
  )
})
