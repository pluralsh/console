import {
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { Confirm, Trash } from 'forge-core'
import { useMutation, useQuery } from 'react-apollo'
import {
  Box,
  Drop,
  Text,
  ThemeContext,
} from 'grommet'
import { useParams } from 'react-router-dom'
import { normalizeColor } from 'grommet/utils'
import { Line } from 'rc-progress'
import { ArcElement, Chart } from 'chart.js'
import { Card } from '@pluralsh/design-system'
import { Flex } from 'honorable'

import {
  Event,
  NodeMetric,
  Node as NodeT,
  Pod,
} from 'generated/graphql'

import { LoopingLogo } from 'components/utils/AnimatedLogo'
import { ignoreEvent } from 'components/utils/events'

import { ScrollablePage } from 'components/layout/ScrollablePage'

import { POLL_INTERVAL } from '../constants'
import { PodsList } from '../pods/PodsList'
import { DELETE_NODE, NODE_Q } from '../queries'
import { roundToTwoPlaces } from '../utils'
import { Metadata } from '../Metadata'

import { NodeGraphs } from './NodeGraphs'
import { SubTitle } from './SubTitle'

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
    ignoreEvent(e)
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
            ignoreEvent(e)
            setConfirm(false)
          }}
          submit={e => {
            ignoreEvent(e)
            mutation()
          }}
        />
      )}
    </>
  )
}

export const podContainers = pods => pods
  .filter(({ status: { phase } }) => phase !== 'Succeeded')
  .map(({ spec: { containers } }) => containers)
  .flat()

export default function NodeInfo() {
  const { name } = useParams()

  const { data, refetch } = useQuery<{
    node: NodeT & {
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

  if (!data) return <LoopingLogo dark />

  const { node, nodeMetric } = data

  return (
    <ScrollablePage heading="Info">
      <Flex
        direction="column"
        gap="xlarge"
      >
        <section>
          <SubTitle>Pods</SubTitle>
          <PodsList
            pods={node.pods}
            refetch={refetch}
            namespace={undefined}
          />
        </section>
        <section>
          <SubTitle>Overview</SubTitle>
          <Card padding="medium">
            <NodeGraphs
              status={node.status}
              pods={node.pods}
              name={name}
              usage={nodeMetric.usage}
            />
          </Card>
        </section>
        <section>
          <Metadata metadata={node.metadata} />
        </section>
      </Flex>
    </ScrollablePage>
  )
}
