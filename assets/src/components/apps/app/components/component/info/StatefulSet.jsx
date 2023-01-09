import { useState } from 'react'
import { Box, Text } from 'grommet'
import { Tabs } from 'forge-core'

import { useParams } from 'react-router-dom'

import { DURATIONS } from 'utils/time'

import RangePicker from 'components/utils/RangePicker'

import { Pie } from '../../../../utils/ProgressGauge'

import { MetadataRow } from './Metadata'
import { ScalingTypes } from './constants'
import { Container, LogLink, logUrl } from './utils'

import { ScalingRecommenderModal } from './ScalingRecommender'

function Status({
  status: {
    currentReplicas, updatedReplicas, readyReplicas, replicas,
  }, metadata,
}) {
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
            success={readyReplicas}
            progress={replicas - readyReplicas}
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
      />
    </Box>
  )
}
