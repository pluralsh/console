// import { Box, Table as Table2, TableBody, TableCell } from '../utils/Ta'
import { Button, Modal } from 'honorable'
import moment from 'moment'
import { useMemo, useState } from 'react'
import {
  Card,
  CopyIcon,
  EmptyState,
  IconFrame,
  InfoIcon,
  ListIcon,
  Table,
  Toast,
  Tooltip,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import CopyToClipboard from 'react-copy-to-clipboard'

import {
  AccessTokenFragment,
  AccessTokensDocument,
  useAccessTokensQuery,
  useCreateAccessTokenMutation,
  useDeleteAccessTokenMutation,
  useTokenAuditsQuery,
} from 'generated/graphql'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import isEmpty from 'lodash/isEmpty'

import { Box } from 'grommet'

import { useTheme } from 'styled-components'

import {
  appendConnection,
  deepUpdate,
  extendConnection,
  mapExistingNodes,
  removeConnection,
  updateCache,
} from '../../utils/graphql'

import { StandardScroller } from '../utils/SmoothScroller'
import { formatLocation } from '../../utils/geo'
import { Confirm } from '../utils/Confirm'
import { DeleteIconButton } from '../utils/IconButtons'

import LoadingIndicator from '../utils/LoadingIndicator'

export const obscureToken = (token) => token.substring(0, 9) + 'x'.repeat(15)

const TOOLTIP =
  'Access tokens allow you to access the Plural API for automation and active Plural clusters.'

function TokenAudits({ token }: any) {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = useTokenAuditsQuery({
    variables: { id: token.id },
    fetchPolicy: 'cache-and-network',
  })

  if (!data) return null

  const { pageInfo, edges } = data.accessToken?.audits || {}

  if (isEmpty(edges) || !pageInfo || !edges) {
    return <>Token has yet to be used</>
  }

  return (
    <div
    // headers={['IP', 'Location', 'Timestamp', 'Count']}
    // sizes={['25%', '25%', '25%', '25%']}
    //   width="100%"
    //   height="100%"
    >
      <Card fill>
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          hasNextPage={pageInfo.hasNextPage}
          items={edges}
          loading={loading}
          placeholder={() => <>Placeholder</>}
          mapper={({ node }, { next: _ }) => (
            <div
              key={node.id}
              // last={!next.node}
            >
              <div>{node.ip}</div>
              <div>{formatLocation(node.country, node.city)}</div>
              <div>{moment(node.timestamp).format('lll')}</div>
              <div>{node.count}</div>
            </div>
          )}
          loadNextPage={() =>
            pageInfo.hasNextPage &&
            fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult }) =>
                deepUpdate(prev, 'token', (prevToken) =>
                  extendConnection(
                    prevToken,
                    fetchMoreResult?.accessToken?.audits,
                    'audits'
                  )
                ),
            })
          }
          handleScroll={() => {}}
          refreshKey={undefined}
          setLoader={undefined}
        />
      </Card>
    </div>
  )
}

function DeleteAccessToken({ token }: { token: AccessTokenFragment }) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteAccessTokenMutation({
    variables: { token: token.token ?? '' },
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
      <DeleteIconButton onClick={() => setConfirm(true)} />
      <Confirm
        open={confirm}
        title="Delete Access Token"
        text="Are you sure you want to delete this api access token?"
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

  return (
    <>
      <IconFrame
        textValue=""
        clickable
        size="medium"
        icon={<ListIcon />}
        onClick={() => setAudits(true)}
      />
      <Modal
        header="Audit logs"
        open={audits}
        portal
        onClose={() => setAudits(false)}
      >
        <TokenAudits token={token} />
      </Modal>
    </>
  )
}

function CopyButton({ token }: { token: AccessTokenFragment }) {
  const [displayCopyBanner, setDisplayCopyBanner] = useState(false)

  return (
    <>
      {displayCopyBanner && (
        <Toast
          severity="success"
          marginBottom="medium"
          marginRight="xxxxlarge"
        >
          Access token copied successfully.
        </Toast>
      )}
      <CopyToClipboard
        text={token.token}
        onCopy={() => {
          setDisplayCopyBanner(true)
          setTimeout(() => setDisplayCopyBanner(false), 1000)
        }}
      >
        <Button
          secondary
          startIcon={<CopyIcon size={15} />}
        >
          Copy key
        </Button>
      </CopyToClipboard>
    </>
  )
}

function DateTimeCol({
  dateString,
}: {
  dateString: string | null | undefined
}) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const theme = useTheme()

  if (!dateString) {
    return null
  }
  const date = moment(dateString)
  const formattedDate = date.format('MM/DD/YY')
  const formattedTime = date.format('h:mma')

  return (
    <div css={{ display: 'flex', flexDirection: 'column' }}>
      <p css={{ ...theme.partials.text.body2 }}>{formattedDate}</p>
      <p
        css={{
          ...theme.partials.text.caption,
          color: theme.colors['text-xlight'],
        }}
      >
        {formattedTime}
      </p>
    </div>
  )
}

const columnHelper = createColumnHelper<AccessTokenFragment>()
const tokenColumns = [
  columnHelper.accessor((row) => row.token, {
    id: 'token',
    header: 'Token',
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <span css={{ ...theme.partials.text.code, fontWeight: 'bold' }}>
          {obscureToken(getValue())}
        </span>
      )
    },
  }),
  columnHelper.accessor((row) => row.insertedAt, {
    id: 'createdOn',
    header: 'Created on',
    cell: ({ getValue }) => <DateTimeCol dateString={getValue()} />,
  }),
  columnHelper.accessor((row) => row.updatedAt, {
    id: 'updatedAt',
    header: 'Updated on',
    cell: ({ getValue }) => <DateTimeCol dateString={getValue()} />,
  }),
  columnHelper.accessor((row) => row.id, {
    id: 'actions',
    cell: ({ row: { original } }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xsmall,
          }}
        >
          <CopyButton token={original} />
          <AuditsButton token={original} />
          <DeleteAccessToken token={original} />
        </div>
      )
    },
  }),
]

export function AccessTokens() {
  const [displayNewBanner, setDisplayNewBanner] = useState(false)
  const { data, loading: loadingTokens, fetchMore: _ } = useAccessTokensQuery()
  const [mutation, { loading }] = useCreateAccessTokenMutation({
    update: (cache, { data }) =>
      updateCache(cache, {
        query: AccessTokensDocument,
        update: (prev) =>
          appendConnection(prev, data?.createAccessToken, 'accessTokens'),
      }),
  })
  const tokensList = useMemo(
    () => mapExistingNodes(data?.accessTokens),
    [data?.accessTokens]
  )

  console.log({ loadingTokens })

  if (!data) return <LoadingIndicator />
  //   const { pageInfo } = data?.accessTokens || {}

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      heading="Access tokens"
      gap="small"
      headingContent={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Tooltip
            width="315px"
            label={TOOLTIP}
          >
            <Box
              flex={false}
              pad="6px"
              round="xxsmall"
              hoverIndicator="fill-two"
            >
              <InfoIcon />
            </Box>
          </Tooltip>
          <Box
            flex
            align="end"
          >
            {displayNewBanner && (
              <Toast
                severity="success"
                marginBottom="medium"
                marginRight="xxxxlarge"
                onClose={() => {
                  alert('toast close')
                  setDisplayNewBanner(false)
                }}
              >
                New access token created.
              </Toast>
            )}
            <Button
              secondary
              onClick={() => {
                setDisplayNewBanner(true)
                // setTimeout(() => setDisplayNewBanner(false), 1000)
                mutation()
              }}
              loading={loading}
            >
              Create access token
            </Button>
          </Box>
        </div>
      }
    >
      {tokensList ? (
        <Table
          data={tokensList}
          columns={tokenColumns}
        />
      ) : (
        <EmptyState message="Looks like you don't have any access tokens yet.">
          <Button
            onClick={() => {
              setDisplayNewBanner(true)
              setTimeout(() => setDisplayNewBanner(false), 1000)
              mutation()
            }}
            loading={loading}
          >
            Create access token
          </Button>
        </EmptyState>
      )}
    </ResponsivePageFullWidth>
  )
}
