import React, {
  useCallback,
  useContext,
  useEffect,
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
import { useNavigate, useParams } from 'react-router-dom'
import { ServerCluster } from 'grommet-icons'
import { memoryParser } from 'kubernetes-resource-parser'
import { filesize } from 'filesize'
import { normalizeColor } from 'grommet/utils'
import { Line } from 'rc-progress'
import { Readiness, nodeStatusToReadiness } from 'utils/status'
import { ArcElement, Chart } from 'chart.js'

import { cpuParser } from '../../../utils/kubernetes'
import { LoopingLogo } from '../../utils/AnimatedLogo'
import { ReadyIcon } from '../../Application'
import { BreadcrumbsContext } from '../../Breadcrumbs'
import { RawContent } from '../Component'
import { POLL_INTERVAL } from '../constants'
import { Events } from '../Event'
import { Metadata, mapify } from '../Metadata'
import { HeaderItem, RowItem, ignore } from '../pods/Pod'
import { PodList } from '../pods/PodList'
import { DELETE_NODE, NODE_Q } from '../queries'

import { NodeGraphs } from './NodeGraphs'

/*
Must explicitly import and register chart.js elements used in react-chartjs-2
*/
Chart.register(ArcElement)

export function NodeRowHeader() {
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

export function UtilBar({
  capacity, usage, format, modifier,
}) {
  const ref = useRef<any>()
  const [hover, setHover] = useState(false)
  const theme = useContext(ThemeContext)
  const percent = roundToTwoPlaces(Math.min((usage / capacity) * 100, 100))
  const color
    = percent < 50 ? 'success' : percent < 75 ? 'status-warning' : 'error'

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
          strokeWidth={2}
          trailWidth={2}
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
            <Text size="small">
              {modifier}: {percent}% {usage ? format(usage) : ''}
            </Text>
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
      setConfirm(false)
      refetch()
    },
  })

  const doConfirm = useCallback(e => {
    ignore(e)
    setConfirm(true)
  },
  [setConfirm])

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
            ignore(e)
            setConfirm(false)
          }}
          submit={e => {
            ignore(e)
            mutation()
          }}
        />
      )}
    </>
  )
}

export function NodeRow({ node, metrics, refetch }) {
  const navigate = useNavigate()
  const labels = mapify(node.metadata.labels)
  const readiness = nodeStatusToReadiness(node.status)
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
        <Text size="small">
          {nodeStatusToReadiness(node.status) === Readiness.Ready ? 'Ready' : 'Pending'}
        </Text>
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
          format={v => `${roundToTwoPlaces(v)} cores`}
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
          <Text size="small">
            {filesize(memoryParser(node?.status?.capacity?.memory)) as any}
          </Text>
        </Box>
        <DeleteNode
          name={node.metadata.name}
          refetch={refetch}
        />
      </Box>
    </Box>
  )
}

export const podContainers = pods => pods
  .filter(({ status: { phase } }) => phase !== 'Succeeded')
  .map(({ spec: { containers } }) => containers)
  .flat()

export function roundToTwoPlaces(x:number) {
  return roundTo(x, 2)
}

export const roundTo = (x: number, decimalPlaces = 2) => {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw Error('decimalPlaces must be positive integer')
  }
  const factor = 10 * Math.floor(decimalPlaces)

  return Math.round(x * factor) / factor
}

export const datum = ({ timestamp, value }) => ({
  x: new Date(timestamp * 1000),
  y: roundToTwoPlaces(parseFloat(value)),
})

export const cpuFmt = cpu => `${cpu}vcpu`

export default function Node() {
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
      { text: name || '', url: `/nodes/${name}` },
    ])
  }, [name, setBreadcrumbs])

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
        >
          {node.metadata.name}
        </Text>
        <ReadyIcon
          readiness={nodeStatusToReadiness(node.status)}
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
            >
              info
            </Text>
          </TabHeaderItem>
          <TabHeaderItem name="events">
            <Text
              size="small"
              weight={500}
            >
              events
            </Text>
          </TabHeaderItem>
          <TabHeaderItem name="raw">
            <Text
              size="small"
              weight={500}
            >
              raw
            </Text>
          </TabHeaderItem>
        </TabHeader>
        <TabContent name="info">
          <Metadata metadata={node.metadata} />
          <PodList
            pods={node.pods}
            refetch={refetch}
            namespace={undefined}
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
