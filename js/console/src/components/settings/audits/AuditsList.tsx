import {
  AppIcon,
  Flex,
  InfoOutlineIcon,
  Table,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { StackedText } from 'components/utils/table/StackedText'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { AuditFragment, useAuditsQuery } from 'generated/graphql'
import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatLocation } from 'utils/geo'
import { extendConnection, mapExistingNodes } from 'utils/graphql'

import { AUDITS_ABS_PATH } from 'routes/settingsRoutesConst'

import { GridTableWrapper } from 'components/utils/layout/ResponsiveGridLayouts'

import { AUDITS_BREADCRUMBS } from './Audits'

const FETCH_MARGIN = 30

const COLUMN_HELPER = createColumnHelper<AuditFragment>()

function HeaderWithInfo({ label, info }: { label: string; info: string }) {
  return (
    <Flex
      align="center"
      gap="xsmall"
    >
      <span>{label}</span>
      <Tooltip label={info}>
        <InfoOutlineIcon
          color="icon-xlight"
          size={12}
        />
      </Tooltip>
    </Flex>
  )
}

const columns = [
  COLUMN_HELPER.accessor((audit) => audit, {
    id: 'action',
    header: () => (
      <HeaderWithInfo
        label="Action"
        info="Action shown on top, type shown on bottom"
      />
    ),
    cell: (audit) => {
      const { action, type } = audit.getValue()

      return (
        <StackedText
          first={action}
          second={type}
        />
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
    header: () => (
      <HeaderWithInfo
        label="Location"
        info="Location shown on top, IP address shown on bottom"
      />
    ),
    cell: (audit: any) => {
      const { ip, country, city } = audit.getValue()

      return (
        <StackedText
          first={country && formatLocation(country, city)}
          second={ip}
        />
      )
    },
  }),
]

const breadcrumbs = [
  ...AUDITS_BREADCRUMBS,
  { label: 'list', url: `${AUDITS_ABS_PATH}/list` },
]

export default function AuditsList() {
  useSetBreadcrumbs(breadcrumbs)

  const { data, loading, fetchMore } = useAuditsQuery({
    fetchPolicy: 'cache-and-network',
  })
  const pageInfo = data?.audits?.pageInfo
  const audits = useMemo(() => mapExistingNodes(data?.audits), [data])

  const fetchMoreOnBottomReached = useCallback(
    (element?: HTMLDivElement | undefined) => {
      if (!element) return

      const { scrollHeight, scrollTop, clientHeight } = element

      // Once scrolled within FETCH_MARGIN of the bottom of the table, fetch more data if there is any.
      if (
        scrollHeight - scrollTop - clientHeight < FETCH_MARGIN &&
        !loading &&
        pageInfo?.hasNextPage
      ) {
        fetchMore({
          variables: { cursor: pageInfo?.endCursor },
          updateQuery: (prev, { fetchMoreResult: { audits } }) =>
            extendConnection(prev, audits, 'audits'),
        })
      }
    },
    [fetchMore, loading, pageInfo]
  )

  if (!data) return <LoadingIndicator />

  return (
    <GridTableWrapper>
      <Table
        data={audits || []}
        columns={columns}
        onScrollCapture={(e) =>
          fetchMoreOnBottomReached(e?.target as HTMLDivElement)
        }
        maxHeight="100%"
      />
    </GridTableWrapper>
  )
}
