import { useCallback, useState } from 'react'
import { useQuery } from 'react-apollo'

import { Box, Text } from 'grommet'

import { GraphView, ListView } from 'forge-core'

import lookup from 'country-code-lookup'

import { useParams } from 'react-router'

import { HeaderItem, RowItem } from '../kubernetes/Pod'
import { dateFormat } from '../utils/Graph'
import Avatar from '../users/Avatar'
import { extendConnection } from '../../utils/graphql'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { formatLocation } from '../../utils/geo'
import { SectionContentContainer } from '../utils/Section'

import { Chloropleth } from '../utils/Chloropleth'
import { SubmenuItem, SubmenuPortal } from '../navigation/Submenu'

import { StandardScroller } from '../utils/SmoothScroller'
import { ReturnToBeginning } from '../Builds'

import { AUDITS_Q, AUDIT_METRICS } from './queries'

const ROW_HEIGHT = 40
const HEIGHT_PX = `${ROW_HEIGHT}px`

export function AvatarCell({ user, width }) {
  return (
    <Box
      flex={false}
      direction="row"
      width={width}
      align="center"
      gap="xsmall"
    >
      <Avatar
        user={user}
        size="30px"
      />
      <Text size="small">{user.email}</Text>
    </Box>
  )
}

function Audit({ audit }) {
  return (
    <Box
      height={HEIGHT_PX}
      direction="row"
      align="center"
      gap="xsmall"
      onClick={() => null}
      hoverIndicator="cardHover"
      pad={{ horizontal: 'small' }}
    >
      <RowItem
        width="10%"
        text={audit.type}
      />
      <RowItem
        width="10%"
        text={audit.action}
      />
      <RowItem
        width="15%"
        text={audit.repository}
      />
      <AvatarCell
        user={audit.actor}
        width="20%"
      />
      <RowItem
        width="15%"
        text={dateFormat(audit.insertedAt)}
      />
      <RowItem
        width="10%"
        text={audit.ip}
      />
      <RowItem
        width="15%"
        text={formatLocation(audit.country, audit.city)}
      />
    </Box>
  )
}

function AuditHeader() {
  return (
    <Box
      flex={false}
      height={HEIGHT_PX}
      direction="row"
      align="center"
      gap="xsmall"
      border={{ side: 'bottom' }}
      pad={{ horizontal: 'small' }}
    >
      <HeaderItem
        width="10%"
        text="type"
      />
      <HeaderItem
        width="10%"
        text="action"
      />
      <HeaderItem
        width="15%"
        text="repository"
      />
      <HeaderItem
        width="20%"
        text="creator"
      />
      <HeaderItem
        width="15%"
        text="timestamp"
      />
      <HeaderItem
        width="10%"
        text="ip"
      />
      <HeaderItem
        width="15%"
        text="location"
      />
    </Box>
  )
}

function AuditGeo() {
  const { data } = useQuery(AUDIT_METRICS, { fetchPolicy: 'cache-and-network' })

  if (!data) return <LoopingLogo dark />

  const metrics = data.auditMetrics.map(({ country, count }) => ({
    id: lookup.byIso(country).iso3, value: count,
  }))

  return (
    <Box fill>
      <Chloropleth data={metrics} />
    </Box>
  )
}

function Placeholder() {
  return (
    <Box
      flex={false}
      fill="horizontal"
      height={HEIGHT_PX}
    />
  )
}

export function Audits() {
  const [listRef, setListRef] = useState(null)
  const [scrolled, setScrolled] = useState(null)
  const { graph } = useParams()
  const { data, loading, fetchMore } = useQuery(AUDITS_Q, { fetchPolicy: 'cache-and-network' })
  const returnToBeginning = useCallback(() => {
    listRef.scrollToItem(0)
  }, [listRef])

  if (!data) return <LoopingLogo dark />

  const { edges, pageInfo } = data.audits

  return (
    <Box
      direction="row"
      fill
      background="backgroundColor"
    >
      <SubmenuPortal name="audits">
        <SubmenuItem
          icon={<ListView size="small" />}
          label="Table View"
          url="/audits/table"
          selected={graph === 'table'}
        />
        <SubmenuItem
          icon={<GraphView size="small" />}
          label="Graph View"
          url="/audits/graph"
          selected={graph === 'graph'}
        />
      </SubmenuPortal>
      <Box fill>
        {scrolled && <ReturnToBeginning beginning={returnToBeginning} />}
        <SectionContentContainer header={graph === 'graph' ? 'Geodistribution' : 'Audit Logs'}>
          {graph === 'table' && (
            <Box fill>
              <AuditHeader />
              <StandardScroller
                listRef={listRef}
                setListRef={setListRef}
                items={edges}
                loading={loading}
                handleScroll={setScrolled}
                placeholder={Placeholder}
                hasNextPage={pageInfo.hasNextPage}
                mapper={({ node }) => (
                  <Audit
                    key={node.id}
                    audit={node}
                  />
                )}
                loadNextPage={() => pageInfo.hasNextPage && fetchMore({
                  variables: { cursor: pageInfo.endCursor },
                  updateQuery: (prev, { fetchMoreResult: { audits } }) => extendConnection(prev, audits, 'audits'),
                })}
              />
            </Box>
          )}
          {graph === 'graph' && <AuditGeo />}
        </SectionContentContainer>
      </Box>
    </Box>

  )
}
