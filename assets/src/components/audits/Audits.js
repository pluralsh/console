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

function Audit({audit}) {
  return (
    <Box direction='row' align='center' gap='xsmall' onClick={() => null} hoverIndicator='backgroundDark' pad='xsmall'>
      <RowItem width='10%' text={audit.type} />
      <RowItem width='10%' text={audit.action} />
      <RowItem width='15%' text={audit.repository} />
      <Box flex={false} direction='row' width='40%' align='center' gap='xsmall'>
        <Avatar user={audit.actor} size='30px' />
        <Text size='small'>{audit.actor.email}</Text>
      </Box>
      <RowItem width='20%' text={dateFormat(audit.insertedAt)} />
    </Box>
  )
}

function AuditHeader() {
  return (
    <Box flex={false} direction='row' align='center' gap='xsmall' border='bottom' pad='xsmall'>
      <HeaderItem width='10%' text='type' />
      <HeaderItem width='10%' text='action' />
      <HeaderItem width='15%' text='repository' />
      <HeaderItem width='40%' text='creator' />
      <HeaderItem width='20%' text='timestamp' />
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