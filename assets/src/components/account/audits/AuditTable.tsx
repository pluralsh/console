import { AppIcon, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Flex, Span } from 'honorable'
import { useCallback, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { extendConnection } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { Link } from 'react-router-dom'

import { useTheme } from 'styled-components'

import { InlineLink } from '../../utils/typography/InlineLink'

import { formatLocation } from '../../../utils/geo'

import { AUDITS_Q } from './queries'

const FETCH_MARGIN = 30

const COLUMN_HELPER = createColumnHelper<any>()

const columns = [
  COLUMN_HELPER.accessor((audit) => audit, {
    id: 'action',
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <div>
          <div>Action</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-light'],
            }}
          >
            Type
          </div>
        </div>
      )
    },
    cell: (audit) => {
      const { action, type } = audit.getValue()

      return (
        <Flex direction="column">
          {action || 'n/a'}
          <Span
            caption
            color="text-xlight"
          >
            {type}
          </Span>
        </Flex>
      )
    },
  }),
  COLUMN_HELPER.accessor((audit) => audit.repository, {
    id: 'repository',
    cell: (repository: any) => (
      <InlineLink
        as={Link}
        to={`/apps/${repository.getValue()}`}
      >
        {repository.getValue()}
      </InlineLink>
    ),
    header: 'Application',
  }),
  COLUMN_HELPER.accessor((audit) => audit.actor, {
    id: 'actor',
    cell: (actor: any) => {
      const a = actor.getValue()

      return (
        <Flex
          align="center"
          gap="xsmall"
        >
          <AppIcon
            url={a.profile}
            name={a.name}
            size="xxsmall"
            spacing="none"
          />
          {a.email}
        </Flex>
      )
    },
    header: 'Creator',
  }),
  COLUMN_HELPER.accessor((audit) => audit.insertedAt, {
    id: 'insertedAt',
    cell: (insertedAt: any) => <DateTimeCol date={insertedAt.getValue()} />,
    header: 'Timestamp',
  }),
  COLUMN_HELPER.accessor((audit) => audit, {
    id: 'locationIp',
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <div>
          <div>Location</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-light'],
            }}
          >
            IP
          </div>
        </div>
      )
    },
    cell: (audit: any) => {
      const { ip, country, city } = audit.getValue()

      if (!ip) return <span>n/a</span>

      return (
        <Flex direction="column">
          {country && <div>{formatLocation(country, city)}</div>}
          <Span
            caption
            color="text-xlight"
          >
            {ip}
          </Span>
        </Flex>
      )
    },
  }),
]

export default function AuditsTable() {
  const { data, loading, fetchMore } = useQuery(AUDITS_Q, {
    fetchPolicy: 'cache-and-network',
  })
  const pageInfo = data?.audits?.pageInfo
  const edges = data?.audits?.edges
  const audits = useMemo(() => edges?.map(({ node }) => node), [edges])

  const fetchMoreOnBottomReached = useCallback(
    (element?: HTMLDivElement | undefined) => {
      if (!element) return

      const { scrollHeight, scrollTop, clientHeight } = element

      // Once scrolled within FETCH_MARGIN of the bottom of the table, fetch more data if there is any.
      if (
        scrollHeight - scrollTop - clientHeight < FETCH_MARGIN &&
        !loading &&
        pageInfo.hasNextPage
      ) {
        fetchMore({
          variables: { cursor: pageInfo.endCursor },
          updateQuery: (prev, { fetchMoreResult: { audits } }) =>
            extendConnection(prev, audits, 'audits'),
        })
      }
    },
    [fetchMore, loading, pageInfo]
  )

  if (!data) return <LoadingIndicator />

  return (
    <FullHeightTableWrap>
      <Table
        data={audits}
        columns={columns}
        onScrollCapture={(e) => fetchMoreOnBottomReached(e?.target)}
        maxHeight="100%"
      />
    </FullHeightTableWrap>
  )
}
