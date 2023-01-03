import { Box, Text } from 'grommet'
import { TabContent, Tabs } from 'forge-core'

import { Metadata, MetadataRow } from './Metadata'

import { Events } from './Event'
import { Container } from './utils'

function Status({ status: { loadBalancer } }) {
  if (!loadBalancer) return null
  if (!loadBalancer.ingress || loadBalancer.ingress.length === 0) return null

  return (
    <Container header="Status">
      <MetadataRow
        name="ip"
        final
      >
        <Text size="small">{loadBalancer.ingress[0].ip}</Text>
      </MetadataRow>
    </Container>
  )
}

function IngressPath({ rule: { host, http: { paths } } }) {
  return (
    <Box
      direction="row"
      gap="small"
    >
      <Box
        flex={false}
        width="20%"
      >
        <Text size="small">{host}</Text>
      </Box>
      <Box fill="horizontal">
        {(paths || []).map(({ path, backend: { serviceName, servicePort } }, ind) => (
          <Box
            key={ind}
            fill="horizontal"
            direction="row"
            align="center"
          >
            <Box width="30%">
              <Text size="small">{path || '*'}</Text>
            </Box>
            <Box fill="horizontal">
              <Text size="small">{serviceName}:{servicePort}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function Spec({ spec: { rules } }) {
  return (
    <Container header="Spec">
      <MetadataRow name="routes">
        <Box
          flex={false}
          fill="horizontal"
        >
          <Box
            direction="row"
            gap="small"
          >
            <Box
              flex={false}
              width="20%"
            >
              <Text
                size="small"
                weight={500}
              >host
              </Text>
            </Box>
            <Box
              flex={false}
              width="17%"
            >
              <Text
                size="small"
                weight={500}
              >path
              </Text>
            </Box>
            <Box
              flex={false}
              fill="horizontal"
            >
              <Text
                size="small"
                weight={500}
              >backend
              </Text>
            </Box>
          </Box>
          {rules.map((rule, ind) => (
            <IngressPath
              key={ind}
              rule={rule}
            />
          ))}
        </Box>
      </MetadataRow>
    </Container>
  )
}

export default function Ingress() {
  return (
    <Box
      fill
      style={{ overflow: 'auto' }}
    >
      <Tabs defaultTab="info">
        <TabContent name="info">
          <Metadata metadata={ingress.metadata} />
          <Status status={ingress.status} />
          <Spec spec={ingress.spec} />
        </TabContent>
        <TabContent name="events">
          <Events events={ingress.events} />
        </TabContent>
      </Tabs>
    </Box>
  )
}
