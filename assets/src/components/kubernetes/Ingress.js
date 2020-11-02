import React from 'react'
import { Box, Text } from 'grommet'
import { Loading } from 'forge-core'
import { useQuery } from 'react-apollo'
import { INGRESS_Q } from './queries'
import { Metadata, MetadataRow } from './Metadata'
import { useParams } from 'react-router'
import { POLL_INTERVAL } from './constants'

function Status({status: {loadBalancer}}) {
  if (!loadBalancer) return null
  if (!loadBalancer.ingress || loadBalancer.ingress.length === 0) return null

  return (
    <Box pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Status</Text>
      </Box>
      <MetadataRow name='ip'>
        <Text size='small'>{loadBalancer.ingress[0].ip}</Text>
      </MetadataRow>
    </Box>
  )
}

function IngressPath({rule: {host, http: {paths}}}) {
  return (
    <Box direction='row' gap='small'>
      <Box flex={false} width='20%'>
        <Text size='small'>{host}</Text>
      </Box>
      <Box fill='horizontal'>
        {(paths || []).map(({path, backend: {serviceName, servicePort}}, ind) => (
          <Box key={ind} fill='horizontal' direction='row' align='center'>
            <Box width='30%'>
              <Text size='small'>{path}</Text>
            </Box>
            <Box fill='horizontal'>
              <Text size='small'>{serviceName}:{servicePort}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function Spec({spec: {rules}}) {
  return (
    <Box pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Spec</Text>
      </Box>
      {rules.map((rule, ind) => <IngressPath key={ind} rule={rule} />)}
    </Box>
  )
}

export default function Ingress() {
  const {name, repo} = useParams()
  const {data} = useQuery(INGRESS_Q, {variables: {name, namespace: repo}, pollInterval: POLL_INTERVAL})

  if (!data) return <Loading />

  const {service} = data
  return (
    <Box fill gap='small'>
      <Metadata metadata={service.metadata} />
      <Status status={service.status} />
      <Spec spec={service.spec} />
    </Box>
  )
}