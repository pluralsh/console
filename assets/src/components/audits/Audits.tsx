import {
  Key,
  useCallback,
  useRef,
  useState,
} from 'react'
import { useQuery } from 'react-apollo'

import { Box, Text } from 'grommet'

import { GraphView, ListView } from 'forge-core'

import lookup from 'country-code-lookup'

import { useParams } from 'react-router-dom'

import { ReturnToBeginning } from 'components/utils/ReturnToBeginning'

import {
  Card,
  LoopingLogo,
  PageTitle,
  SubTab,
  TabList,
} from '@pluralsh/design-system'

import { Flex, Span } from 'honorable'

import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { HeaderItem, RowItem } from '../kubernetes/Pod'
import { dateFormat } from '../utils/Graph'
import Avatar from '../users/Avatar'
import { extendConnection } from '../../utils/graphql'
import { formatLocation } from '../../utils/geo'
import { SectionContentContainer } from '../utils/Section'

import { Chloropleth } from '../utils/Chloropleth'
import { SubmenuItem, SubmenuPortal } from '../navigation/Submenu'

import { StandardScroller } from '../utils/SmoothScroller'

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
        onClick={undefined}
        round={undefined}
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
        truncate={undefined}
      />
      <RowItem
        width="10%"
        text={audit.action}
        truncate={undefined}
      />
      <RowItem
        width="15%"
        text={audit.repository}
        truncate={undefined}
      />
      <AvatarCell
        user={audit.actor}
        width="20%"
      />
      <RowItem
        width="15%"
        text={dateFormat(audit.insertedAt)}
        truncate={undefined}
      />
      <RowItem
        width="10%"
        text={audit.ip}
        truncate={undefined}
      />
      <RowItem
        width="15%"
        text={formatLocation(audit.country, audit.city)}
        truncate={undefined}
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
        nobold={undefined}
        truncate={undefined}
      />
      <HeaderItem
        width="10%"
        text="action"
        nobold={undefined}
        truncate={undefined}
      />
      <HeaderItem
        width="15%"
        text="repository"
        nobold={undefined}
        truncate={undefined}
      />
      <HeaderItem
        width="20%"
        text="creator"
        nobold={undefined}
        truncate={undefined}
      />
      <HeaderItem
        width="15%"
        text="timestamp"
        nobold={undefined}
        truncate={undefined}
      />
      <HeaderItem
        width="10%"
        text="ip"
        nobold={undefined}
        truncate={undefined}
      />
      <HeaderItem
        width="15%"
        text="location"
        nobold={undefined}
        truncate={undefined}
      />
    </Box>
  )
}

function AuditGeo() {
  const { data } = useQuery(AUDIT_METRICS, { fetchPolicy: 'cache-and-network' })

  if (!data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  const metrics = data.auditMetrics.map(({ country, count }) => ({
    id: lookup.byIso(country)?.iso3, value: count,
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

const DIRECTORY = [
  { key: 'table', label: 'Table view' },
  { key: 'graph', label: 'Graph view' },
]

export function Audits() {
  const tabStateRef = useRef<any>(null)
  const [view, setView] = useState<Key>(DIRECTORY[0].key)

  const [listRef, setListRef] = useState<any>(null)
  const [scrolled, setScrolled] = useState<any>(null)
  const { graph } = useParams()
  const { data, loading, fetchMore } = useQuery(AUDITS_Q, { fetchPolicy: 'cache-and-network' })
  const returnToBeginning = useCallback(() => listRef.scrollToItem(0), [listRef])

  if (!data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  const { edges, pageInfo } = data.audits

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding="large"
      position="relative"
    >
      <ResponsiveLayoutSidenavContainer width={240} />
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer overflowY="hidden">
        <PageTitle heading="Audits">
          <Flex grow={1} />
          <TabList
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: view,
              onSelectionChange: setView,
            }}
          >
            {DIRECTORY.map(({ key, label }) => (
              <SubTab
                key={key}
                textValue={label}
              >
                <Span fontWeight={600}>{label}</Span>
              </SubTab>
            ))}
          </TabList>
        </PageTitle>
        <Card flexGrow="1">
          <Box
            direction="row"
            fill
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
                      refreshKey={undefined}
                      setLoader={undefined}
                    />
                  </Box>
                )}
                {graph === 'graph' && <AuditGeo />}
              </SectionContentContainer>
            </Box>
          </Box>
        </Card>
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer width={200} />
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
