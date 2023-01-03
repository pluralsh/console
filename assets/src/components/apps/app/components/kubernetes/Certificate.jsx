import { Box, Text } from 'grommet'
import { TabContent, Tabs } from 'forge-core'

import { Metadata, MetadataRow } from './Metadata'
import { Container } from './utils'
import { Events } from './Event'
import { RawContent } from './Component'

function Status({ status: { notBefore, notAfter, renewalTime } }) {
  return (
    <Container header="Status">
      <MetadataRow name="renewal date">
        <Text size="small">{renewalTime}</Text>
      </MetadataRow>
      <MetadataRow name="not before">
        <Text size="small">{notBefore}</Text>
      </MetadataRow>
      <MetadataRow
        name="not after"
        final
      >
        <Text size="small">{notAfter}</Text>
      </MetadataRow>
    </Container>
  )
}

function Spec({ spec: { secretName, dnsNames, issuerRef } }) {
  return (
    <Container header="Spec">
      <MetadataRow name="secret name">
        <Text size="small">{secretName}</Text>
      </MetadataRow>
      <MetadataRow name="dns names">
        <Box
          flex={false}
          fill="horizontal"
        >
          {dnsNames.map((dns, i) => (
            <Box
              fill="horizontal"
              key={i}
            >
              <Text size="small">{dns}</Text>
            </Box>
          ))}
        </Box>
      </MetadataRow>
      <MetadataRow name="issuer">
        <Text size="small">{issuerRef.group}/{issuerRef.kind.toLowerCase()} {issuerRef.name}</Text>
      </MetadataRow>
    </Container>
  )
}

export function Certificate() {
  return (
    <Box
      fill
      style={{ overflow: 'auto' }}
    >
      <Tabs defaultTab="info">
        <TabContent name="info">
          <Metadata metadata={certificate.metadata} />
          <Status status={certificate.status} />
          <Spec spec={certificate.spec} />
        </TabContent>
        <TabContent name="events">
          <Events events={certificate.events} />
        </TabContent>
      </Tabs>
    </Box>
  )
}
