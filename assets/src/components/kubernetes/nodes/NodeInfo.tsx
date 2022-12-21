import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Confirm, Node as NodeI, Trash } from 'forge-core'
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

import { PageTitle } from '@pluralsh/design-system'

import { Event, NodeMetric, Pod } from 'generated/graphql'

import { H1 } from 'honorable'

import styled from 'styled-components'

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
import { roundToTwoPlaces } from '../utils'

import { NodeGraphs } from './NodeGraphs'

const SubTitle = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle1,
}))

/*
Must explicitly import and register chart.js elements used in react-chartjs-2
*/
Chart.register(ArcElement)

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
          {nodeStatusToReadiness(node.status) === Readiness.Ready
            ? 'Ready'
            : 'Pending'}
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

export default function Node() {
  const { name } = useParams()

  const { data, refetch } = useQuery<{
    node: Node & {
      raw?: string
      pods?: Pod[]
      events?: Event[]
    }
    nodeMetric: NodeMetric
  }>(NODE_Q, {
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

  console.log('node.raw', node.raw)

  return (
    <>
      <PageTitle title="Info" />
      <SubTitle>Pods</SubTitle>
      <PodList
        pods={node.pods}
        refetch={refetch}
        namespace={undefined}
      />
      <SubTitle>Overview</SubTitle>
      <NodeGraphs
        status={node.status}
        pods={node.pods}
        name={name}
        usage={nodeMetric.usage}
      />

    </>
  )
}
