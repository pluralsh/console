import { memo, useContext, useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { Box, ThemeContext } from 'grommet'
import { memoryParser } from 'kubernetes-resource-parser'
import { filesize } from 'filesize'
import { sumBy } from 'lodash'
import { Doughnut } from 'react-chartjs-2'
import { normalizeColor } from 'grommet/utils'
import { Chart } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

import { cpuParser } from 'utils/kubernetes'

import { ClusterMetrics as Metrics } from '../constants'
import { NODE_METRICS_Q } from '../queries'

import { cpuFmt, roundToTwoPlaces } from '../utils'

Chart.register(ChartDataLabels)

export function ClusterGauges({ nodes, usage }: { nodes: any; usage: any }) {
  const totalCpu = sumBy(nodes,
    ({
      status: {
        capacity: { cpu },
      },
    }: any) => cpuParser(cpu))
  const totalMem = sumBy(nodes,
    ({
      status: {
        capacity: { memory },
      },
    }: any) => memoryParser(memory))
  const totalPods = sumBy(nodes,
    ({
      status: {
        capacity: { pods },
      },
    }: any) => parseInt(pods))

  const { data } = useQuery(NODE_METRICS_Q, {
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

  const result = useMemo(() => {
    if (!data) {
      return null
    }
    const {
      cpuRequests, cpuLimits, memRequests, memLimits, pods,
    } = data

    const datum = data => roundToTwoPlaces(parseFloat(data[0].values[0].value))

    return {
      cpuRequests: datum(cpuRequests),
      cpuLimits: datum(cpuLimits),
      memRequests: datum(memRequests),
      memLimits: datum(memLimits),
      pods: datum(pods),
    }
  }, [data])

  if (!result) {
    return null
  }

  const {
    cpuRequests, cpuLimits, memRequests, memLimits, pods,
  } = result

  return (
    <Box
      flex={false}
      direction="row"
      gap="small"
      align="center"
    >
      <LayeredGauge
        usage={usage.cpu}
        requests={cpuRequests}
        limits={cpuLimits}
        total={totalCpu}
        title="CPU Reservation"
        name="CPU"
        format={cpuFmt}
      />
      <LayeredGauge
        usage={usage.mem}
        requests={memRequests}
        limits={memLimits}
        total={totalMem}
        title="Memory Reservation"
        name="Mem"
        format={filesize}
      />
      <SimpleGauge
        value={pods || undefined}
        total={totalPods}
        title="Pod Usage"
        name="Pods"
      />
    </Box>
  )
}

export const SimpleGauge = memo(({
  value,
  total,
  title,
  name,
}: {
    value?: number;
    total?: number;
    title: string;
    name: string;
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
    requests: any;
    limits: any;
    usage: any;
    total: any;
    title: any;
    name: any;
    format: any;
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
