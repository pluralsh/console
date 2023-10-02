import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  Chip,
  EmptyState,
  Input,
  SearchIcon,
  SubTab,
  TabList,
  Table,
} from '@pluralsh/design-system'
import {
  AuthMethod,
  GitHealth,
  GitRepositoriesDocument,
  type GitRepositoriesRowFragment,
  useDeleteGitRepositoryMutation,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { ComponentProps, Key, useMemo, useRef, useState } from 'react'
import { isEmpty } from 'lodash'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { createMapperWithFallback } from 'utils/mapping'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { removeConnection, updateCache } from 'utils/graphql'
import { useDebounce } from '@react-hooks-library/core'

import { useSetCDHeaderContent } from '../ContinuousDeployment'

import {
  ColAuthMethod,
  ColCreatedAt,
  ColOwner,
  ColPulledAt,
  ColRepo,
  ColStatus,
  ColUpdatedAt,
  getColActions,
} from './GitRepositoriesColumns'
import { ImportGit } from './GitRepositoriesImportGit'

const POLL_INTERVAL = 10 * 1000

// Will need to update once delete mutation exists in API
export function DeleteGitRepository({
  repo,
  refetch,
}: {
  repo: Pick<GitRepositoriesRowFragment, 'id' | 'url'>
  refetch: () => void
}) {
  const theme = useTheme()
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteGitRepositoryMutation({
    variables: { id: repo.id ?? '' },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: GitRepositoriesDocument,
        update: (prev) =>
          removeConnection(prev, data?.deleteGitRepository, 'gitRepositories'),
      }),
    onCompleted: () => {
      setConfirm(false)
      refetch?.()
    },
  })

  return (
    <>
      <DeleteIconButton
        onClick={() => setConfirm(true)}
        tooltip
      />
      <Confirm
        open={confirm}
        title="Delete Git Repository"
        text={
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
            }}
          >
            <p>Are you sure you want to delete this Git repository?"</p>
            <p>{repo.url}</p>
          </div>
        }
        close={() => setConfirm(false)}
        submit={() => mutation()}
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}

const authMethodToLabel = createMapperWithFallback<AuthMethod, string>(
  {
    SSH: 'SSH',
    BASIC: 'Basic',
  },
  'Unknown'
)

export function AuthMethodChip({
  authMethod,
}: {
  authMethod: AuthMethod | null | undefined
}) {
  return <Chip severity="neutral">{authMethodToLabel(authMethod)}</Chip>
}

export const gitHealthToLabel = createMapperWithFallback<GitHealth, string>(
  {
    PULLABLE: 'Pullable',
    FAILED: 'Failed',
  },
  'Unknown'
)

const gitHealthToSeverity = createMapperWithFallback<
  GitHealth,
  ComponentProps<typeof Chip>['severity']
>(
  {
    PULLABLE: 'success',
    FAILED: 'critical',
  },
  'neutral'
)

export function GitHealthChip({
  health,
  error,
}: {
  health: GitHealth | null | undefined
  error?: string | null | undefined
}) {
  return (
    <Chip
      tooltip={error || undefined}
      severity={gitHealthToSeverity(health)}
    >
      {gitHealthToLabel(health)}
    </Chip>
  )
}

type StatusTabKey = GitHealth | 'ALL'
const statusTabs = Object.entries({
  ALL: { label: 'All' },
  [GitHealth.Failed]: { label: gitHealthToLabel(GitHealth.Failed) },
  [GitHealth.Pullable]: { label: gitHealthToLabel(GitHealth.Pullable) },
} as const satisfies Record<StatusTabKey, { label: string }>)

export default function GitRepositories() {
  const theme = useTheme()
  const { data, error, refetch } = useGitRepositoriesQuery({
    pollInterval: POLL_INTERVAL,
  })
  const columns = useMemo(
    () => [
      ColRepo,
      ColAuthMethod,
      ColStatus,
      ColCreatedAt,
      ColUpdatedAt,
      ColPulledAt,
      ColOwner,
      getColActions({ refetch }),
    ],
    [refetch]
  )

  const counts = useMemo(() => {
    const c: Record<string, number | undefined> = {
      ALL: data?.gitRepositories?.edges?.length,
    }

    data?.gitRepositories?.edges?.forEach((edge) => {
      if (edge?.node?.health) {
        c[edge?.node?.health] = (c[edge?.node?.health] ?? 0) + 1
      }
    })

    return c
  }, [data?.gitRepositories?.edges])

  console.log('data', data, 'error', error?.extraInfo)

  useSetCDHeaderContent(
    useMemo(() => <ImportGit refetch={refetch} />, [refetch])
  )
  const tabStateRef = useRef<any>(null)
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)
  const [statusFilterKey, setStatusTabKey] = useState<Key>('ALL')
  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        state: {
          globalFilter: debouncedFilterString,
          filterFns: [],
          columnFilters: [
            ...(statusFilterKey !== 'ALL'
              ? [
                  {
                    id: 'status',
                    value: statusFilterKey,
                  },
                ]
              : []),
          ],
        },
      }),
      [debouncedFilterString, statusFilterKey]
    )

  console.log('data', data)
  if (error) {
    return (
      <EmptyState message="Looks like you don't have any Git repositories yet." />
    )
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <div css={{ display: 'flex', columnGap: theme.spacing.medium }}>
        <Input
          placeholder="Search"
          startIcon={
            <SearchIcon
              border={undefined}
              size={undefined}
            />
          }
          value={filterString}
          onChange={(e) => {
            setFilterString(e.currentTarget.value)
          }}
          css={{ flexGrow: 1 }}
        />
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: statusFilterKey,
            onSelectionChange: (key) => {
              setStatusTabKey(key)
            },
          }}
        >
          {statusTabs.map(([key, { label }]) => (
            <SubTab
              key={key}
              textValue={label}
              css={{
                display: 'flex',
                gap: theme.spacing.small,
                alignItems: 'center',
              }}
            >
              {label}
              {counts[key] && (
                <Chip
                  size="small"
                  severity={gitHealthToSeverity(key as any)}
                >
                  {counts[key]}
                </Chip>
              )}
            </SubTab>
          ))}
        </TabList>
      </div>
      {!isEmpty(data?.gitRepositories?.edges) ? (
        <FullHeightTableWrap>
          <Table
            data={data?.gitRepositories?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            reactTableOptions={reactTableOptions}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any Git repositories yet." />
      )}
    </div>
  )
}
