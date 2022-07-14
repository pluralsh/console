import React, { useEffect, useState } from 'react'
import { Box, Text } from 'grommet'
import { TabContent, TabHeader, TabHeaderItem, Tabs } from 'forge-core'
import { useQuery } from 'react-apollo'

import { useParams } from 'react-router'

import { useIntercom } from 'react-use-intercom'

import { DURATIONS, RangePicker } from '../Dashboard'

import { LoopingLogo } from '../utils/AnimatedLogo'

import { Pie } from '../utils/ProgressGauge'

import { DEPLOYMENT_Q } from './queries'
import { Metadata, MetadataRow } from './Metadata'
import { POLL_INTERVAL, ScalingTypes } from './constants'
import { PodList } from './Pod'
import { RawContent } from './Component'
import { Events } from './Event'
import { Metric } from './Metrics'
import { Container, LogLink, logUrl } from './utils'

import { ScalingRecommenderModal } from './ScalingRecommender'

function Status({ status: { availableReplicas, replicas, unavailableReplicas }, metadata }) {
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
            success={availableReplicas}
            progress={replicas - availableReplicas - unavailableReplicas}
            error={unavailableReplicas}
          />
        </Box>
        <Box fill="horizontal">
          <MetadataRow name="replicas">
            <Text size="small">{replicas}</Text>
          </MetadataRow>
          <MetadataRow name="available">
            <Text size="small">{availableReplicas}</Text>
          </MetadataRow>
          <MetadataRow name="unavailable">
            <Text size="small">{unavailableReplicas}</Text>
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

function Spec({ spec: { strategy } }) {
  return (
    <Container header="Spec">
      <MetadataRow
        name="strategy"
        final
      >
        <Text size="small">{strategy.type}</Text>
      </MetadataRow>
    </Container>
  )
}

export default function Deployment() {
  const [tab, setTab] = useState('info')
  const [duration, setDuration] = useState(DURATIONS[0])
  const { name, repo } = useParams()
  const { data, refetch } = useQuery(DEPLOYMENT_Q, {
    variables: { name, namespace: repo },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const { update } = useIntercom()

  useEffect(() => {
    update({ hideDefaultLauncher: true })

    return () => update({ hideDefaultLauncher: false })
  }, [])

  if (!data) return <LoopingLogo dark />

  const { deployment } = data

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
            kind={ScalingTypes.DEPLOYMENT}
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
          <Metadata metadata={deployment.metadata} />
          <Status
            status={deployment.status}
            metadata={deployment.metadata}
          />
          <Spec spec={deployment.spec} />
          <PodList
            pods={deployment.pods}
            refetch={refetch}
            namespace={repo}
          />
        </TabContent>
        <TabContent name="metrics">
          <Metric
            namespace={repo}
            name={name}
            regex="-[a-z0-9]+-[a-z0-9]+"
            duration={duration}
          />
        </TabContent>
        <TabContent name="events">
          <Events events={deployment.events} />
        </TabContent>
        <TabContent name="raw">
          <RawContent raw={deployment.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}
