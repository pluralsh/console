import React from 'react'
import { useQuery } from 'react-apollo'
import { Scroller } from 'forge-core'
import { AUDITS_Q } from './queries'
import { HeaderItem, RowItem } from '../kubernetes/Pod'
import { Box, Text } from 'grommet'
import { dateFormat } from '../utils/Graph'
import Avatar from '../users/Avatar'
import { extendConnection } from '../../utils/graphql'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { formatLocation } from '../../utils/geo'

function Audit({audit}) {
  return (
    <Box direction='row' align='center' gap='xsmall' onClick={() => null} hoverIndicator='backgroundDark' pad='xsmall'>
      <RowItem width='10%' text={audit.type} />
      <RowItem width='10%' text={audit.action} />
      <RowItem width='15%' text={audit.repository} />
      <Box flex={false} direction='row' width='30%' align='center' gap='xsmall'>
        <Avatar user={audit.actor} size='30px' />
        <Text size='small'>{audit.actor.email}</Text>
      </Box>
      <RowItem width='10%' text={dateFormat(audit.insertedAt)} />
      <RowItem width='10%' text={audit.ip} />
      <RowItem width='10%' text={formatLocation(audit.country, audit.city)} />
    </Box>
  )
}

function AuditHeader() {
  return (
    <Box flex={false} direction='row' align='center' gap='xsmall' border='bottom' pad='xsmall'>
      <HeaderItem width='10%' text='type' />
      <HeaderItem width='10%' text='action' />
      <HeaderItem width='15%' text='repository' />
      <HeaderItem width='30%' text='creator' />
      <HeaderItem width='10%' text='timestamp' />
      <HeaderItem width='10%' text='ip' />
      <HeaderItem width='10%' text='location' />
    </Box>
  )
}

export function Audits() {
  const {data, fetchMore} = useQuery(AUDITS_Q)

  if (!data) return <LoopingLogo />

  const {edges, pageInfo} = data.audits
  return (
    <Box fill pad='small' background='backgroundColor'>
      <AuditHeader />
      <Scroller
        id='builds'
        style={{height: '100%', overflow: 'auto'}}
        edges={edges}
        mapper={({node}) => <Audit key={node.id} audit={node} />}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({
          variables: {cursor: pageInfo.endCursor},
          updateQuery: (prev, {fetchMoreResult: {audits}}) => extendConnection(prev, audits, 'audits')
        })} />
    </Box>
  )
}