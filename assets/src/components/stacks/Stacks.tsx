import {
  EmptyState,
  Input,
  LoopingLogo,
  SearchIcon,
  TabPanel,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import React, {
  ComponentProps,
  Suspense,
  useMemo,
  useRef,
  useState,
} from 'react'
import { isEmpty } from 'lodash'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@react-hooks-library/core'
import { type Row, createColumnHelper } from '@tanstack/react-table'

import {
  STACKS_ABS_PATH,
  getStacksAbsPath,
} from '../../routes/stacksRoutesConsts'
import { GqlError } from '../utils/Alert'
import { mapExistingNodes } from '../../utils/graphql'
import { StackFragment, useStacksQuery } from '../../generated/graphql'
import { PluralErrorBoundary } from '../cd/PluralErrorBoundary'
import LoadingIndicator from '../utils/LoadingIndicator'
import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth'
import { FullHeightTableWrap } from '../utils/layout/FullHeightTableWrap'
import { useFetchPaginatedData } from '../cd/utils/useFetchPaginatedData'
import { Title1H1 } from '../utils/typography/Text'
import { ColWithIcon } from '../utils/table/ColWithIcon'
import { StackedText } from '../utils/table/StackedText'
import { ClusterProviderIcon } from '../utils/Provider'
import { TRUNCATE_LEFT } from '../utils/truncate'
import { TableCaretLink } from '../cluster/TableElements'

import CreateStack from './create/CreateStack'
import { StackTypeIcon } from './common/StackTypeIcon'
import StackStatusChip from './common/StackStatusChip'
import StackApprovalChip from './common/StackApprovalChip'

export const BREADCRUMBS = [{ label: 'stacks', url: STACKS_ABS_PATH }]

const QUERY_PAGE_SIZE = 100

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const COLUMN_HELPER = createColumnHelper<StackFragment>()

const COLUMNS = [
  COLUMN_HELPER.accessor((stack) => stack, {
    id: 'name',
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <div>
          <div>Stack name</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-light'],
            }}
          >
            Repository
          </div>
        </div>
      )
    },
    meta: { truncate: true },
    cell: ({ getValue }) => {
      const stack = getValue()

      return (
        <ColWithIcon
          truncateLeft
          icon={
            <StackTypeIcon
              size={16}
              stackType={stack.type}
            />
          }
        >
          <StackedText
            css={{ ...TRUNCATE_LEFT }}
            first={stack.name}
            second={stack.repository?.url}
          />
        </ColWithIcon>
      )
    },
  }),
  COLUMN_HELPER.accessor((stack) => stack, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const stack = getValue()

      return (
        <StackStatusChip
          paused={!!stack.paused}
          deleting={!!stack.deletedAt}
        />
      )
    },
  }),
  COLUMN_HELPER.accessor((stack) => stack.git, {
    id: 'git',
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <div>
          <div>Folder</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-light'],
            }}
          >
            Ref
          </div>
        </div>
      )
    },
    cell: ({ getValue }) => {
      const git = getValue()

      return (
        <StackedText
          first={git.folder}
          second={git.ref}
        />
      )
    },
  }),
  COLUMN_HELPER.accessor((stack) => stack.cluster, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => {
      const cluster = getValue()

      return (
        <ColWithIcon
          truncateLeft
          icon={
            <ClusterProviderIcon
              cluster={cluster}
              size={16}
            />
          }
        >
          {cluster?.name}
        </ColWithIcon>
      )
    },
  }),
  COLUMN_HELPER.accessor((stack) => stack.approval, {
    id: 'approval',
    header: 'Approval',
    cell: ({ getValue }) => <StackApprovalChip approval={!!getValue()} />,
  }),
  COLUMN_HELPER.display({
    id: 'actions',
    meta: { gridTemplate: 'minmax(25px, 50px)' },
    cell: ({ row: { original } }) => (
      <TableCaretLink
        style={{ alignSelf: 'end' }}
        to={getStacksAbsPath(original?.id)}
        textValue={`View ${original?.name} details`}
      />
    ),
  }),
]

export default function Stacks() {
  const theme = useTheme()
  const navigate = useNavigate()
  const tabStateRef = useRef<any>(null)
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 100)

  useSetBreadcrumbs(BREADCRUMBS)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: useStacksQuery,
      pageSize: QUERY_PAGE_SIZE,
      queryKey: 'infrastructureStacks',
    },
    {
      q: debouncedSearchString,
    }
  )

  const stacks = useMemo(
    () => mapExistingNodes(data?.infrastructureStacks),
    [data?.infrastructureStacks]
  )

  if (error)
    return (
      <div css={{ padding: theme.spacing.large }}>
        <GqlError
          header="Cannot load stacks"
          error={error}
        />
      </div>
    )

  if (!data) {
    return <LoopingLogo />
  }

  return (
    <ResponsivePageFullWidth
      headingContent={
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            flexGrow: 1,
            width: '100%',
          }}
        >
          <Title1H1 css={{ flexGrow: 1, margin: 0 }}>
            Infrastructure stacks
          </Title1H1>
          <Input
            flexGrow={1}
            placeholder="Search by name"
            startIcon={<SearchIcon />}
            value={searchString}
            onChange={(e) => {
              setSearchString?.(e.currentTarget.value)
            }}
          />
          <CreateStack refetch={refetch} />
        </div>
      }
    >
      <PluralErrorBoundary>
        <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        >
          <Suspense fallback={<LoadingIndicator />}>
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.small,
                height: '100%',
              }}
            >
              {!isEmpty(stacks) ? (
                <FullHeightTableWrap>
                  <Table
                    columns={COLUMNS}
                    reactTableOptions={{ meta: { refetch } }}
                    reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
                    data={stacks || []}
                    virtualizeRows
                    hasNextPage={pageInfo?.hasNextPage}
                    fetchNextPage={fetchNextPage}
                    isFetchingNextPage={loading}
                    onVirtualSliceChange={setVirtualSlice}
                    onRowClick={(_e, { original }: Row<StackFragment>) =>
                      navigate(getStacksAbsPath(original.id))
                    }
                    css={{
                      maxHeight: 'unset',
                      height: '100%',
                    }}
                  />
                </FullHeightTableWrap>
              ) : (
                <EmptyState message="Looks like you don't have any infrastructure stacks yet.">
                  <CreateStack refetch={refetch} />
                </EmptyState>
              )}
            </div>
          </Suspense>
        </TabPanel>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
