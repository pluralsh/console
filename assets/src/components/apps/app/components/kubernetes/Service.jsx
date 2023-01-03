import { Box, Text } from 'grommet'
import { TabContent, Tabs } from 'forge-core'

import { LoopingLogo } from '../../../../utils/AnimatedLogo'

import { Metadata, MetadataRow } from './Metadata'
import { PodList } from './Pod'
import { Events } from './Event'
import { Container } from './utils'

function Status({ status: { loadBalancer } }) {
  if (!loadBalancer) return null
  if (!loadBalancer.ingress || loadBalancer.ingress.length === 0) return null

  return (
    <Container header="Status">
      <MetadataRow name="ip">
        <Text size="small">{loadBalancer.ingress[0].ip}</Text>
      </MetadataRow>
    </Container>
  )
}

function PortRow({
  port: {
    name, protocol, port, targetPort,
  },
}) {
  return (
    <Box
      fill="horizontal"
      flex={false}
      direction="row"
      align="center"
    >
      {name && (
        <Box width="10%">
          <Text size="small">{name}</Text>
        </Box>
      )}
      <Box width="50px">
        <Text size="small">{protocol}</Text>
      </Box>
      <Box fill="horizontal">
        <Text size="small">{port} {'->'} {targetPort}</Text>
      </Box>
    </Box>
  )
}

function Spec({ spec: { clusterIp, type, ports } }) {
  return (
    <Container header="Spec">
      <MetadataRow name="Cluster Ip">
        <Text size="small">{clusterIp}</Text>
      </MetadataRow>
      <MetadataRow name="Type">
        <Text size="small">{type}</Text>
      </MetadataRow>
      <MetadataRow
        name="Ports"
        final
      >
        <Box
          flex={false}
          fill="horizontal"
        >
          {(ports || []).map(port => (
            <PortRow
              key={port.name}
              port={port}
            />
          ))}
        </Box>
      </MetadataRow>
    </Container>
  )
}

export function Service() {
  return (
    <Box
      fill
      style={{ overflow: 'auto' }}
    >
      <Tabs defaultTab="info">
        <TabContent name="info">
          <Metadata metadata={service.metadata} />
          <Status status={service.status} />
          <Spec spec={service.spec} />
          <PodList
            pods={service.pods}
            refetch={refetch}
            namespace={undefined} // TODO: repo.
          />
        </TabContent>
        <TabContent name="events">
          <Events events={service.events} />
        </TabContent>
      </Tabs>
    </Box>
  )
}
