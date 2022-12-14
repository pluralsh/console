import { AppIcon, LoopingLogo, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Date } from 'components/utils/Date'
import { Flex } from 'honorable'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import { useQuery } from 'react-apollo'
import { extendConnection } from 'utils/graphql'

import { AUDITS_Q } from '../queries'

import { AuditLocation } from './AuditLocation'
import { AuditAction } from './AuditAction'

const FETCH_MARGIN = 30

const COLUMN_HELPER = createColumnHelper<any>()

const columns = [
  COLUMN_HELPER.accessor(audit => audit, {
    id: 'action',
    cell: (audit: any) => <AuditAction audit={audit.getValue()} />,
    header: 'Action / Type',
  }),
  COLUMN_HELPER.accessor(audit => audit.repository, {
    id: 'repository',
    cell: (repository: any) => repository.getValue(),
    header: 'Application',
  }),
  COLUMN_HELPER.accessor(audit => audit.actor, {
    id: 'actor',
    cell: (actor: any) => {
      const a = actor.getValue()

      return (
        <Flex
          align="center"
          gap="xsmall"
        >
          {/* TODO: Fix aspect ratios. */}
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
  COLUMN_HELPER.accessor(audit => audit.insertedAt, {
    id: 'insertedAt',
    cell: (insertedAt: any) => <Date date={insertedAt.getValue()} />,
    header: 'Timestamp',
  }),
  COLUMN_HELPER.accessor(audit => audit, {
    id: 'locationIp',
    cell: (audit: any) => {
      const a = audit.getValue()

      return (
        <AuditLocation
          ip={a.ip}
          country={a.country}
          city={a.city}
        />
      )
    },
    header: 'Location / IP',
  }),
]

export default function AuditsTable() {
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { data, loading, fetchMore } = useQuery(AUDITS_Q, { fetchPolicy: 'cache-and-network' })
  const pageInfo = data?.audits?.pageInfo
  const edges = data?.audits?.edges
  const audits = useMemo(() => edges?.map(({ node }) => node), [edges])

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Audits', url: '/audits' },
      { text: 'Table', url: '/audits/table' },
    ])
  }, [setBreadcrumbs])

  const fetchMoreOnBottomReached = useCallback((element?: HTMLDivElement | undefined) => {
    if (!element) return

    const { scrollHeight, scrollTop, clientHeight } = element

        // Once scrolled within FETCH_MARGIN of the bottom of the table, fetch more data if there is any.
    if (scrollHeight - scrollTop - clientHeight < FETCH_MARGIN && !loading && pageInfo.hasNextPage) {
      fetchMore({
        variables: { cursor: pageInfo.endCursor },
        updateQuery: (prev, { fetchMoreResult: { audits } }) => extendConnection(prev, audits, 'audits'),
      })
    }
  }, [fetchMore, loading, pageInfo])

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

  return (
    <Table
      data={audits}
      columns={columns}
      onScrollCapture={e => fetchMoreOnBottomReached(e?.target)}
      maxHeight="calc(100vh - 244px)"
    />
  )
}
