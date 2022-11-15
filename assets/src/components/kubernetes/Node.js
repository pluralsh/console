import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Confirm,
  Node as NodeI,
  TabContent,
  TabHeader,
  TabHeaderItem,
  Tabs,
  Trash,
} from 'forge-core'
import { useMutation, useQuery } from 'react-apollo'

import {
  Box,
  Drop,
  Text,
  ThemeContext,
} from 'grommet'
import { useNavigate, useParams } from 'react-router'

import { ServerCluster } from 'grommet-icons'

import { memoryParser } from 'kubernetes-resource-parser'
import filesize from 'filesize'

import { sumBy } from 'lodash'
import { Doughnut } from 'react-chartjs-2'
import { normalizeColor } from 'grommet/utils'

import { Line } from 'rc-progress'

import { cpuParser } from '../../utils/kubernetes'
import { format } from '../Dashboard'
import { Graph } from '../utils/Graph'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { Readiness, ReadyIcon } from '../Application'
import { BreadcrumbsContext } from '../Breadcrumbs'

import { RawContent } from './Component'
import { ClusterMetrics as Metrics, NodeMetrics, POLL_INTERVAL } from './constants'

import { Events } from './Event'

import { Metadata, mapify } from './Metadata'
import {
  HeaderItem,
  PodList,
  RowItem,
  ignore,
  podResources,
} from './Pod'
import {
  CLUSTER_SATURATION,
  DELETE_NODE,
  NODES_Q,
  NODE_METRICS_Q,
  NODE_Q,
} from './queries'

function NodeRowHeader() {
  return (
    <Box
      direction="row"
      align="center"
      border="bottom"
      pad="small"
    >
      <HeaderItem
        width="30%"
        text="name"
      />
      <HeaderItem
        width="10%"
        text="status"
      />
      <HeaderItem
        width="10%"
        text="cpu"
      />
      <HeaderItem
        width="10%"
        text="memory"
      />
      <HeaderItem
        width="10%"
        text="region"
      />
      <HeaderItem
        width="10%"
        text="zone"
      />
      <HeaderItem
        width="10%"
        text="cpu"
      />
      <HeaderItem
        width="10%"
        text="memory"
      />
    </Box>
  )
}

function UtilBar({
  capacity, usage, format, modifier,
}) {
  const ref = useRef()
  const [hover, setHover] = useState(false)
  const theme = useContext(ThemeContext)
  const percent = round(Math.min((usage / capacity) * 100, 100))
  const color = percent < 50 ? 'success' : (percent < 75 ? 'status-warning' : 'error')

  return (
    <>
      <Box
        flex={false}
        ref={ref}
        fill="horizontal"
        height="20px"
        align="center"
        justify="center"
        onMouseOver={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <Line
          percent={percent}
          trailColor={normalizeColor('cardDetailLight', theme)}
          strokeColor={normalizeColor(color, theme)}
          strokeWidth="2"
          trailWidth="2"
        />
      </Box>
      {hover && (
        <Drop
          target={ref.current}
          plain
          align={{ bottom: 'top' }}
          round="xsmall"
        >
          <Box
            direction="row"
            gap="xsmall"
            align="center"
            background="sidebar"
            pad={{ horizontal: 'small', vertical: 'xsmall' }}
          >
            <Text size="small">{modifier}: {percent}% {usage ? format(usage) : ''}</Text>
          </Box>
        </Drop>
      )}
    </>
  )
}

export function DeleteNode({ name, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_NODE, {
    variables: { name },
    onCompleted: () => {
      setConfirm(false); refetch()
    },
  })

  const doConfirm = useCallback(e => {
    ignore(e)
    setConfirm(true)
  }, [setConfirm])

  return (
    <>
      <Box
        onClick={doConfirm}
        pad={{ horizontal: 'small' }}
      >
        <Trash
          color={loading ? 'dark-5' : 'error'}
          size="small"
        />
      </Box>
      {confirm && (
        <Confirm
          header={`Are you sure you want to delete ${name}`}
          description="The node will be replaced within its autoscaling group."
          loading={loading}
          cancel={e => {
            ignore(e); setConfirm(false)
          }}
          submit={e => {
            ignore(e); mutation()
          }}
        />
      )}
    </>
  )
}

function NodeRow({ node, metrics, refetch }) {
  const navigate = useNavigate()
  const labels = mapify(node.metadata.labels)
  const readiness = nodeReadiness(node.status)
  const nodeMetrics = metrics[node.metadata.name]

  return (
    <Box
      fill="horizontal"
      direction="row"
      align="center"
      border="bottom"
      hoverIndicator="backgroundDark"
      onClick={() => navigate(`/nodes/${node.metadata.name}`)}
      pad="small"
    >
      <Box
        flex={false}
        width="30%"
        direction="row"
        align="center"
        gap="xsmall"
      >
        <NodeI size="small" />
        <Text size="small">{node.metadata.name}</Text>
      </Box>
      <Box
        flex={false}
        width="10%"
        direction="row"
        gap="xsmall"
        align="center"
      >
        <ReadyIcon
          size="12px"
          readiness={readiness}
        />
        <Text size="small">{nodeReadiness(node.status) === Readiness.Ready ? 'Ready' : 'Pending'}</Text>
      </Box>
      <Box
        flex={false}
        width="10%"
        direction="row"
        gap="xsmall"
        align="center"
        pad={{ horizontal: 'xsmall' }}
      >
        <UtilBar
          capacity={cpuParser(node.status.capacity.cpu)}
          usage={nodeMetrics && nodeMetrics.cpu}
          format={v => `${round(v)} cores`}
          modifier="CPU"
        />
      </Box>
      <Box
        flex={false}
        width="10%"
        direction="row"
        gap="xsmall"
        align="center"
        pad={{ horizontal: 'xsmall' }}
      >
        <UtilBar
          capacity={memoryParser(node.status.capacity.memory)}
          usage={nodeMetrics && nodeMetrics.memory}
          format={filesize}
          modifier="Mem"
        />
      </Box>
      <RowItem
        width="10%"
        text={labels['failure-domain.beta.kubernetes.io/region']}
      />
      <RowItem
        width="10%"
        text={labels['failure-domain.beta.kubernetes.io/zone']}
      />
      <RowItem
        width="10%"
        text={cpuParser(node.status.capacity.cpu)}
      />
      <Box
        width="10%"
        direction="row"
        align="center"
        gap="small"
      >
        <Box fill="horizontal">
          <Text size="small">{filesize(memoryParser(node.status.capacity.memory))}</Text>
        </Box>
        <DeleteNode
          name={node.metadata.name}
          refetch={refetch}
        />
      </Box>
    </Box>
  )
}

const podContainers = pods => (
  pods.filter(({ status: { phase } }) => phase !== 'Succeeded')
    .map(({ spec: { containers } }) => containers)
    .flat()
)

function NodeGraphs({
  status: { capacity }, pods, name, usage,
}) {
  const { requests, limits } = useMemo(() => {
    const containers = podContainers(pods)
    const requests = podResources(containers, 'requests')
    const limits = podResources(containers, 'limits')

    return { requests, limits }
  }, [pods])
  const localize = useCallback(metric => metric.replaceAll('{instance}', name), [name])

  return (
    <Box
      flex={false}
      direction="row"
      gap="medium"
      align="center"
    >
      <LayeredGauage
        usage={cpuParser(usage.cpu)}
        requests={requests.cpu}
        limits={limits.cpu}
        total={cpuParser(capacity.cpu)}
        name="CPU"
        title="CPU Reservation"
        stable
        format={cpuFmt}
      />
      <LayeredGauage
        usage={memoryParser(usage.memory)}
        requests={requests.memory}
        limits={limits.memory}
        total={memoryParser(capacity.memory)}
        name="Mem"
        title="Memory Reservation"
        stable
        format={filesize}
      />
      <Box fill="horizontal">
        <SaturationGraphs
          cpu={localize(NodeMetrics.CPU)}
          mem={localize(NodeMetrics.Memory)}
        />
      </Box>
    </Box>
  )
}

const round = x => Math.round(x * 100) / 100

const SimpleGauge = React.memo(({
  value, total, title, name,
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

const LayeredGauage = React.memo(({
  requests, limits, usage, total, title, name, format,
}) => {
  const theme = useContext(ThemeContext)
  const data = useMemo(() => {
    const reqs = requests || 0
    const lims = limits || 0
    const tot = (total || 0)
    const used = round(usage)

    return {
      labels: [`${name} requests`, `${name} remaining`, `${name} limits`, `${name} remaining`, `${name} used`, `${name} free`],
      datasets: [
        {
          label: [`${name} requests`, `${name} available`],
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
          label: [`${name} limits`, `${name} available`],
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
          label: [`${name} utilized`, `${name} available`],
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
                  const labelIndex = (context.datasetIndex * 2) + context.dataIndex

                  return ` ${context.chart.data.labels[labelIndex]}: ${format(context.raw)}`
                },
              },
            },
          },
        }}
      />
    </Box>
  )
})

const datum = ({ timestamp, value }) => ({ x: new Date(timestamp * 1000), y: round(parseFloat(value)) })

function SaturationGraphs({ cpu, mem }) {
  const { data } = useQuery(CLUSTER_SATURATION, {
    variables: { cpuUtilization: cpu, memUtilization: mem, offset: 2 * 60 * 60 },
    fetchPolicy: 'network-only',
    pollInterval: 10000,
  })

  const result = useMemo(() => {
    if (!data) return null

    const { cpuUtilization, memUtilization } = data

    if (!cpuUtilization[0] || !memUtilization[0]) return null

    return ([
      { id: 'cpu utilization', data: cpuUtilization[0].values.map(datum) },
      { id: 'memory utilization', data: memUtilization[0].values.map(datum) },
    ])
  }, [data])

  if (!result) return null

  return (
    <Box
      fill="horizontal"
      gap="small"
      height="250px"
    >
      <Graph
        data={result}
        yFormat={v => format(v, 'percent')}
      />
    </Box>
  )
}

const cpuFmt = cpu => `${cpu}vcpu`

function ClusterGauges({ nodes, usage }) {
  const totalCpu = sumBy(nodes, ({ status: { capacity: { cpu } } }) => cpuParser(cpu))
  const totalMem = sumBy(nodes, ({ status: { capacity: { memory } } }) => memoryParser(memory))
  const totalPods = sumBy(nodes, ({ status: { capacity: { pods } } }) => parseInt(pods))

  const { data } = useQuery(NODE_METRICS_Q, {
    variables: {
      cpuRequests: Metrics.CPURequests,
      cpuLimits: Metrics.CPULimits,
      memRequests: Metrics.MemoryRequests,
      memLimits: Metrics.MemoryLimits,
      pods: Metrics.Pods,
      offset: 5 * 60,
    },
    fetchPolicy: 'network-first',
    pollInterval: 5000,
  })

  const result = useMemo(() => {
    if (!data) return null
    const {
      cpuRequests, cpuLimits, memRequests, memLimits, pods,
    } = data

    const datum = data => round(parseFloat(data[0].values[0].value))

    return {
      cpuRequests: datum(cpuRequests),
      cpuLimits: datum(cpuLimits),
      memRequests: datum(memRequests),
      memLimits: datum(memLimits),
      pods: datum(pods),
    }
  })

  if (!result) return null

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
      <LayeredGauage
        usage={usage.cpu}
        requests={cpuRequests}
        limits={cpuLimits}
        total={totalCpu}
        title="CPU Reservation"
        name="CPU"
        format={cpuFmt}
      />
      <LayeredGauage
        usage={usage.mem}
        requests={memRequests}
        limits={memLimits}
        total={totalMem}
        title="Memory Reservation"
        name="Mem"
        format={filesize}
      />
      <SimpleGauge
        value={pods}
        total={totalPods}
        title="Pod Usage"
        name="Pods"
      />
    </Box>
  )
}

function ClusterMetrics({ nodes, usage }) {
  return (
    <Box
      flex={false}
      direction="row"
      fill="horizontal"
      gap="small"
      align="center"
      pad="small"
    >
      <ClusterGauges
        nodes={nodes}
        usage={usage}
      />
      <SaturationGraphs
        cpu={Metrics.CPU}
        mem={Metrics.Memory}
      />
      {/* <Box fill='horizontal' direction='row' align='center' gap='small'>
      </Box> */}
    </Box>
  )
}

function nodeReadiness(status) {
  const ready = status.conditions.find(({ type }) => type === 'Ready')

  if (ready.status === 'True') return Readiness.Ready

  return Readiness.InProgress
}

export function Node() {
  const { name } = useParams()
  const { data, refetch } = useQuery(NODE_Q, {
    variables: { name },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'nodes', url: '/nodes' },
      { text: name, url: `/nodes/${name}` },
    ])
  }, [])

  if (!data) return <LoopingLogo dark />

  const { node, nodeMetric } = data

  return (
    <Box
      fill
      style={{ overflow: 'auto' }}
      background="backgroundColor"
      pad="small"
      gap="small"
    >
      <Box
        direction="row"
        align="center"
        gap="small"
        pad="small"
      >
        <ServerCluster size="15px" />
        <Text
          size="small"
          weight="bold"
        >{node.metadata.name}
        </Text>
        <ReadyIcon
          readiness={nodeReadiness(node.status)}
          size="20px"
          showIcon
        />
      </Box>
      <NodeGraphs
        status={node.status}
        pods={node.pods}
        name={name}
        usage={nodeMetric.usage}
      />
      <Tabs defaultTab="info">
        <TabHeader>
          <TabHeaderItem name="info">
            <Text
              size="small"
              weight={500}
            >info
            </Text>
          </TabHeaderItem>
          <TabHeaderItem name="events">
            <Text
              size="small"
              weight={500}
            >events
            </Text>
          </TabHeaderItem>
          <TabHeaderItem name="raw">
            <Text
              size="small"
              weight={500}
            >raw
            </Text>
          </TabHeaderItem>
        </TabHeader>
        <TabContent name="info">
          <Metadata metadata={node.metadata} />
          <PodList
            pods={node.pods}
            refetch={refetch}
          />
        </TabContent>
        <TabContent name="events">
          <Events events={node.events} />
        </TabContent>
        <TabContent name="raw">
          <RawContent raw={node.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}

export function Nodes() {
  const { data, refetch } = useQuery(NODES_Q, {
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'nodes', url: '/nodes' },
    ])
  }, [])

  const metrics = useMemo(() => {
    if (!data) return {}

    return data.nodeMetrics.reduce((prev, { metadata: { name }, usage }) => ({
      ...prev, [name]: { cpu: cpuParser(usage.cpu), memory: memoryParser(usage.memory) },
    }), {})
  })

  const usage = useMemo(() => {
    if (!data) return null

    const cpu = sumBy(data.nodeMetrics, ({ usage: { cpu } }) => cpuParser(cpu))
    const mem = sumBy(data.nodeMetrics, ({ usage: { memory } }) => memoryParser(memory))

    return { cpu, mem }
  })

  if (!data) return <LoopingLogo dark />

  return (
    <Box
      style={{ overflow: 'auto' }}
      fill
      background="backgroundColor"
      pad="small"
      gap="small"
    >
      <Box
        flex={false}
        fill="horizontal"
      >
        <ClusterMetrics
          nodes={data.nodes}
          usage={usage}
        />
        <Box
          flex={false}
          fill="horizontal"
        >
          <NodeRowHeader />
          {data.nodes.map((node, ind) => (
            <NodeRow
              key={ind}
              node={node}
              metrics={metrics}
              refetch={refetch}
            />
          ))}
        </Box>
      </Box>
    </Box>
  )
}
