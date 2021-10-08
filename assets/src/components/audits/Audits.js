import React, { useState } from 'react'
import { useQuery } from 'react-apollo'
import { Scroller } from 'forge-core'
import { AUDITS_Q, AUDIT_METRICS } from './queries'
import { HeaderItem, RowItem } from '../kubernetes/Pod'
import { Box, Text } from 'grommet'
import { dateFormat } from '../utils/Graph'
import Avatar from '../users/Avatar'
import { extendConnection } from '../../utils/graphql'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { formatLocation } from '../../utils/geo'
import { SectionChoice, SectionContentContainer } from '../utils/Section'
import { List, PieChart } from 'grommet-icons'
import lookup from 'country-code-lookup'
import { Chloropleth } from '../utils/Chloropleth'
import { SubmenuItem, SubmenuPortal } from '../navigation/Submenu'
import { useParams } from 'react-router'


const ROW_HEIGHT = 40
const HEIGHT_PX = `${ROW_HEIGHT}px`

function Audit({audit}) {
  return (
    <Box height={HEIGHT_PX} direction='row' align='center' gap='xsmall' 
         onClick={() => null} hoverIndicator='light-3' pad='xsmall'
         pad={{horizontal: 'small'}}>
      <RowItem width='10%' text={audit.type} />
      <RowItem width='10%' text={audit.action} />
      <RowItem width='15%' text={audit.repository} />
      <Box flex={false} direction='row' width='20%' align='center' gap='xsmall'>
        <Avatar user={audit.actor} size='30px' />
        <Text size='small'>{audit.actor.email}</Text>
      </Box>
      <RowItem width='15%' text={dateFormat(audit.insertedAt)} />
      <RowItem width='10%' text={audit.ip} />
      <RowItem width='15%' text={formatLocation(audit.country, audit.city)} />
    </Box>
  )
}

function AuditHeader() {
  return (
    <Box flex={false} height={HEIGHT_PX} direction='row' align='center' 
         gap='xsmall' border={{side: 'bottom', color: 'light-4'}} 
         pad={{horizontal: 'small'}}>
      <HeaderItem width='10%' text='type' />
      <HeaderItem width='10%' text='action' />
      <HeaderItem width='15%' text='repository' />
      <HeaderItem width='20%' text='creator' />
      <HeaderItem width='15%' text='timestamp' />
      <HeaderItem width='10%' text='ip' />
      <HeaderItem width='15%' text='location' />
    </Box>
  )
}

function AuditGeo() {
  const {data} = useQuery(AUDIT_METRICS, {fetchPolicy: 'cache-and-network'})

  if (!data) return <LoopingLogo />

  const metrics = data.auditMetrics.map(({country, count}) => ({
    id: lookup.byIso(country).iso3, value: count
  }))

  return (
    <Box fill>
      <Chloropleth data={metrics} />
    </Box>
  )
}

export function Audits() {
  const {graph} = useParams()
  const {data, fetchMore} = useQuery(AUDITS_Q, {fetchPolicy: "cache-and-network"})

  if (!data) return <LoopingLogo />

  const {edges, pageInfo} = data.audits
  return (
    <Box direction='row' fill background='backgroundColor'>
      <SubmenuPortal name='audits'>
        <SubmenuItem
          icon={<List size='small' />}
          label='Table View'
          url='/audits/table'
          selected={graph === 'table'} />
        <SubmenuItem
          icon={<PieChart size='small' />}
          label='Graph View'
          url='/audits/graph'
          selected={graph === 'graph'} />
      </SubmenuPortal>
      <Box fill background='plrl-white'>
        <SectionContentContainer header={graph ? 'Geodistribution' : 'Audit Logs'}>
          {graph === 'table' && (
            <Box fill>
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
          )}
          {graph === 'graph' && <AuditGeo />}
        </SectionContentContainer>
      </Box>
    </Box>
    
  )
}