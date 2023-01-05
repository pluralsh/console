import { useEffect, useState } from 'react'
import { Box, Text } from 'grommet'
import { TabContent, Tabs } from 'forge-core'

import { useIntercom } from 'react-use-intercom'

import { DURATIONS } from 'utils/time'

import RangePicker from 'components/utils/RangePicker'

import { Pie } from '../../../../utils/ProgressGauge'

import { MetadataRow } from '../../../../../cluster/Metadata'
import { ScalingTypes } from '../../../../cluster/constants'
import { Metric } from '../../../../../cluster/Metrics'
import { Container, LogLink, logUrl } from '../../../../../cluster/utils'

import { ScalingRecommenderModal } from '../../../../../cluster/ScalingRecommender'

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

  const { update } = useIntercom()

  useEffect(() => {
    update({ hideDefaultLauncher: true })

    return () => update({ hideDefaultLauncher: false })
  }, [])

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
        <TabContent name="info">
          <Status
            status={deployment.status}
            metadata={deployment.metadata}
          />
          <Spec spec={deployment.spec} />
        </TabContent>
        <TabContent name="metrics">
          <Metric
            namespace={repo}
            name={name}
            regex="-[a-z0-9]+-[a-z0-9]+"
            duration={duration}
          />
        </TabContent>
      </Tabs>
    </Box>
  )
}
