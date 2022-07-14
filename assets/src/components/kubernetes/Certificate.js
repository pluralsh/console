import React from 'react'
import { Box, Text } from 'grommet'
import { TabContent, TabHeader, TabHeaderItem, Tabs } from 'forge-core'

import { useParams } from 'react-router'

import { useQuery } from '@apollo/react-hooks'

import { LoopingLogo } from '../utils/AnimatedLogo'

import { Metadata, MetadataRow } from './Metadata'
import { Container } from './utils'
import { CERTIFICATE_Q } from './queries'
import { Events } from './Event'
import { RawContent } from './Component'
import { POLL_INTERVAL } from './constants'

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
          {dnsNames.map(dns => (
            <Box fill="horizontal">
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
  const { name, repo } = useParams()
  const { data } = useQuery(CERTIFICATE_Q, {
    variables: { name, namespace: repo }, 
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  if (!data) return <LoopingLogo dark />

  const { certificate } = data

  return (
    <Box
      fill
      style={{ overflow: 'auto' }}
    >
      <Tabs defaultTab="info">
        <TabHeader>
          <TabHeaderItem name="info">
            <Text
              size="small"
              weight={500}
            >info
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
          <Metadata metadata={certificate.metadata} />
          <Status status={certificate.status} />
          <Spec spec={certificate.spec} />
        </TabContent>
        <TabContent name="events">
          <Events events={certificate.events} />
        </TabContent>
        <TabContent name="raw">
          <RawContent raw={certificate.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}
