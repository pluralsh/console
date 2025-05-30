import {
  Button,
  EmptyState,
  Flex,
  IconFrame,
  InfoIcon,
  ListIcon,
  Modal,
  Table,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  AccessTokenAudit,
  AccessTokenFragment,
  AccessTokensDocument,
  DeleteAccessTokenMutationVariables,
  useAccessTokensQuery,
  useDeleteAccessTokenMutation,
  useTokenAuditsQuery,
} from 'generated/graphql'

import isEmpty from 'lodash/isEmpty'
import { Suspense, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'

import { useLocation } from 'react-router-dom'

import {
  SETTINGS_BREADCRUMBS,
  SettingsPageHeader,
} from 'components/settings/Settings'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import { formatLocation } from '../../utils/geo'
import {
  Edge,
  mapExistingNodes,
  removeConnection,
  updateCache,
} from '../../utils/graphql'
import { Confirm } from '../utils/Confirm'
import { DeleteIconButton } from '../utils/IconButtons'
import LoadingIndicator from '../utils/LoadingIndicator'
import { DateTimeCol } from '../utils/table/DateTimeCol'

import { ModalMountTransition } from '../utils/ModalMountTransition'

import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { AccessTokensCreateModal } from './AccessTokensCreateModal'
import { AccessTokensScopes } from './AccessTokensScopes'
import { PROFILE_BREADCRUMBS } from './MyProfile'

const TOOLTIP =
  'Access tokens allow you to access the Plural API for automation and active Plural clusters.'

const auditColumnHelper = createColumnHelper<Edge<AccessTokenAudit>>()
const auditColumns = [
  auditColumnHelper.accessor(({ node }) => node?.ip, {
    id: 'ip',
    header: 'IP',
    cell: ({ getValue }) => getValue(),
    meta: { truncate: true },
    enableSorting: true,
  }),
  auditColumnHelper.accessor(
    ({ node }) => formatLocation(node?.country, node?.city),
    {
      id: 'location',
      header: 'Location',
      cell: ({ getValue }) => getValue(),
      meta: { truncate: true },
      enableSorting: true,
    }
  ),
  auditColumnHelper.accessor(({ node }) => new Date(node?.timestamp || 0), {
    id: 'timestamp',
    header: 'Timestamp',
    cell: ({
      getValue,
      row: {
        original: { node },
      },
    }) => node?.timestamp && formatDateTime(getValue(), 'lll'),
    meta: { truncate: true },
    enableSorting: true,
    sortingFn: 'datetime',
  }),
  auditColumnHelper.accessor(({ node }) => node?.count, {
    id: 'count',
    header: 'Count',
    cell: ({ getValue }) => getValue(),
    meta: { truncate: true },
    enableSorting: true,
    sortingFn: 'basic',
  }),
]

function TokenAudits({ tokenId }: { tokenId: string }) {
  const theme = useTheme()
  const { data } = useTokenAuditsQuery({
    variables: { id: tokenId },
    fetchPolicy: 'cache-and-network',
  })

  if (!data) {
    return <p css={{ ...theme.partials.text.body2 }}>...</p>
  }

  const { pageInfo, edges } = data.accessToken?.audits || {}

  if (isEmpty(edges) || !pageInfo || !edges) {
    return (
      <p css={{ ...theme.partials.text.body2 }}>Token has yet to be used</p>
    )
  }

  return (
    <Table
      fullHeightWrap
      data={edges}
      columns={auditColumns}
    />
  )
}

function DeleteAccessToken({ token }: { token: AccessTokenFragment }) {
  const theme = useTheme()
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteAccessTokenMutation({
    variables: {
      id: token.id ?? '',
    } satisfies DeleteAccessTokenMutationVariables,
    update: (cache, { data }) =>
      updateCache(cache, {
        query: AccessTokensDocument,
        update: (prev) =>
          removeConnection(prev, data?.deleteAccessToken, 'accessTokens'),
      }),
    onCompleted: () => setConfirm(false),
  })

  return (
    <>
      <DeleteIconButton
        onClick={() => setConfirm(true)}
        tooltip
      />
      <Confirm
        open={confirm}
        title="Delete Access Token"
        text={
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
            }}
          >
            <p>Are you sure you want to delete this API access token?</p>
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

function AuditsButton({ token }: { token: AccessTokenFragment }) {
  const [audits, setAudits] = useState(false)

  if (!token.id) {
    return null
  }

  return (
    <>
      <IconFrame
        textValue="Audits"
        tooltip
        clickable
        size="medium"
        icon={<ListIcon />}
        onClick={() => setAudits(true)}
      />
      <Modal
        header="Audit logs"
        open={audits}
        onClose={() => setAudits(false)}
      >
        <TokenAudits tokenId={token.id} />
      </Modal>
    </>
  )
}

const tokenColumnHelper = createColumnHelper<AccessTokenFragment>()
const tokenColumns = [
  tokenColumnHelper.accessor((row) => row.id, {
    id: 'id',
    header: 'ID',
    cell: ({ getValue }) => getValue(),
    meta: { truncate: true },
  }),
  tokenColumnHelper.accessor((row) => row.insertedAt, {
    id: 'createdOn',
    header: 'Created on',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  tokenColumnHelper.accessor((row) => row.id, {
    id: 'actions',
    header: '',
    cell: function Cell({ row: { original } }) {
      const theme = useTheme()

      return (
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xsmall,
          }}
        >
          <AccessTokensScopes token={original} />
          <AuditsButton token={original} />
          <DeleteAccessToken token={original} />
        </div>
      )
    },
  }),
]

const profileBreadcrumbs = [...PROFILE_BREADCRUMBS, { label: 'access-tokens' }]
const settingsBreadcrumbs = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'access-tokens' },
]

export function AccessTokens() {
  const isInSettings = useLocation().pathname.includes('settings')
  const [open, setOpen] = useState(false)
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useAccessTokensQuery,
      keyPath: ['accessTokens'],
    })

  useSetBreadcrumbs(isInSettings ? settingsBreadcrumbs : profileBreadcrumbs)

  const tokensList = useMemo(
    () => mapExistingNodes(data?.accessTokens),
    [data?.accessTokens]
  )

  const headingContent = (
    <SettingsPageHeader
      heading={
        <Flex gap="small">
          Access tokens
          <Tooltip
            css={{ width: 315 }}
            label={TOOLTIP}
          >
            <InfoIcon />
          </Tooltip>
        </Flex>
      }
    >
      {!isEmpty(tokensList) && (
        <Button
          secondary
          onClick={() => setOpen(true)}
        >
          Create access token
        </Button>
      )}
    </SettingsPageHeader>
  )

  // this will throw a warning from the profile route but that's fine
  useSetPageHeaderContent(headingContent)

  if (!data && loading) return <LoadingIndicator />
  if (error) return <GqlError error={error} />

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {!isInSettings && headingContent}
      {!isEmpty(tokensList) ? (
        <Table
          fullHeightWrap
          virtualizeRows
          data={tokensList}
          columns={tokenColumns}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
        />
      ) : (
        <EmptyState message="Looks like you don't have any access tokens yet.">
          <Button
            secondary
            onClick={() => setOpen(true)}
          >
            Create access token
          </Button>
        </EmptyState>
      )}
      <Suspense fallback={null}>
        <ModalMountTransition open={open}>
          <AccessTokensCreateModal
            open={open}
            setOpen={setOpen}
          />
        </ModalMountTransition>
      </Suspense>
    </div>
  )
}
