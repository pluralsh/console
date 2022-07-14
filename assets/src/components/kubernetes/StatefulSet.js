import { useEffect, useState } from 'react'
import { Box, Text } from 'grommet'
import { TabContent, TabHeader, TabHeaderItem, Tabs } from 'forge-core'
import { useQuery } from 'react-apollo'

import { useParams } from 'react-router'

import { useIntercom } from 'react-use-intercom'

import { DURATIONS, RangePicker } from '../Dashboard'

import { LoopingLogo } from '../utils/AnimatedLogo'

import { Pie } from '../utils/ProgressGauge'

import { STATEFUL_SET_Q } from './queries'
import { Metadata, MetadataRow } from './Metadata'
import { POLL_INTERVAL, ScalingTypes } from './constants'
import { PodList } from './Pod'
import { RawContent } from './Component'
import { Events } from './Event'
import { Metric } from './Metrics'
import { Container, LogLink, logUrl } from './utils'

import { ScalingRecommenderModal } from './ScalingRecommender'

function Status({ status: { currentReplicas, updatedReplicas, readyReplicas, replicas }, metadata }) {
  return (
    <Container header="Status">
      <Box
        fill="horizontal"
        direction="row"
        gap="small"
        align="center"
      >
        <Box
          height="200px"
          width="375px"
          align="center"
          justify="center"
        >
          <Pie 
            success={updatedReplicas} 
            progress={replicas - updatedReplicas} 
            error={0}
          />
        </Box>
        <Box fill="horizontal">
          <MetadataRow name="replicas">
            <Text size="small">{replicas}</Text>
          </MetadataRow>
          <MetadataRow name="current replicas">
            <Text size="small">{currentReplicas}</Text>
          </MetadataRow>
          <MetadataRow name="updated replicas">
            <Text size="small">{updatedReplicas}</Text>
          </MetadataRow>
          <MetadataRow name="ready replicas">
            <Text size="small">{readyReplicas}</Text>
          </MetadataRow>
          <MetadataRow
            name="logs"
            final
          >
            <LogLink url={logUrl(metadata)} />
          </MetadataRow>
        </Box>
      </Box>
    </Container>
  )
}

function Spec({ spec: { serviceName } }) {
  return (
    <Container header="Spec">
      <MetadataRow name="service">
        <Text size="small">{serviceName}</Text>
      </MetadataRow>
    </Container>
  )
}

export default function StatefulSet() {
  const [tab, setTab] = useState('info')
  const [duration, setDuration] = useState(DURATIONS[0])
  const { name, repo } = useParams()
  const { data, refetch } = useQuery(STATEFUL_SET_Q, {
    variables: { name, namespace: repo }, 
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const { update } = useIntercom()
  useEffect(() => {
    update({ hideDefaultLauncher: true })

    return () => update({ hideDefaultLauncher: false })
  }, [])

  if (!data) return <LoopingLogo dark />

  const { statefulSet } = data

  return (
    <Box
      fill
      style={{ overflow: 'auto' }}
    >
      <Tabs
        defaultTab="info"
        onTabChange={setTab}
        headerEnd={tab === 'metrics' ? (
          <RangePicker
            duration={duration}
            setDuration={setDuration}
          />
        ) : (
          <ScalingRecommenderModal
            kind={ScalingTypes.STATEFULSET}
            name={name}
            namespace={repo}
          />
        )}
      >
        <TabHeader>
          <TabHeaderItem name="info">
            <Text
              size="small"
              weight={500}
            >info
            </Text>
          </TabHeaderItem>
          <TabHeaderItem name="metrics">
            <Text
              size="small"
              weight={500}
            >metrics
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
          <Metadata metadata={statefulSet.metadata} />
          <Status
            status={statefulSet.status}
            metadata={statefulSet.metadata}
          />
          <Spec spec={statefulSet.spec} />
          <PodList
            pods={statefulSet.pods}
            refetch={refetch}
            namespace={repo}
          />
        </TabContent>
        <TabContent name="metrics">
          <Metric
            name={name}
            namespace={repo}
            regex="-[0-9]+"
            duration={duration}
          />
        </TabContent>
        <TabContent name="events">
          <Events events={statefulSet.events} />
        </TabContent>
        <TabContent name="raw">
          <RawContent raw={statefulSet.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}
