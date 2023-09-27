import { createColumnHelper } from '@tanstack/react-table'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  AppIcon,
  Button,
  ClusterIcon,
  EmptyState,
  Table,
} from '@pluralsh/design-system'
import {
  type ClustersRowFragment,
  // GitRepositoriesDocument,
  // GitRepositoriesRowFragment,
  useGitRepositoriesQuery,
  // useDeleteGitRepositoryMutation,
} from 'generated/graphql'
import {
  Edge,
  // removeConnection,
  // updateCache
} from 'utils/graphql'
import styled, { useTheme } from 'styled-components'
import { ComponentProps } from 'react'
import { isEmpty } from 'lodash'
// import { Confirm } from 'components/utils/Confirm'
// import { DeleteIconButton } from 'components/utils/IconButtons'

const ColWithIconSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
}))

export function ColWithIcon({
  icon,
  children,
  ...props
}: ComponentProps<typeof ColWithIconSC>) {
  return (
    <ColWithIconSC {...props}>
      <div className="icon">
        <AppIcon
          size="xxsmall"
          icon={icon}
        />
        <div className="content">{children}</div>
      </div>
    </ColWithIconSC>
  )
}

/*
function DeleteGitRepository({
  repo,
}: {
  repo: Pick<GitRepositoriesRowFragment, 'id' | 'url'>
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
*/

const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()
const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => <div css={{}}>{getValue()}</div>,
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.provider?.name, {
    id: 'cloud',
    header: 'Cloud',
    cell: ({
      getValue,
      // row: {
      //   original: { node },
      // },
    }) => <ColWithIcon icon={<ClusterIcon />}>{getValue()}</ColWithIcon>,
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'actions',
    header: '',
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
          <Button
            onClick={() => {
              alert(`Create ${original?.node?.id}`)
            }}
          >
            Create
          </Button>
          <Button
            onClick={() => {
              alert(`Update ${original?.node?.id}`)
            }}
          >
            Update
          </Button>
          {/* <DeleteGitRepository repo={original} /> */}
        </div>
      )
    },
  }),
]

export default function Clusters() {
  const { data } = useGitRepositoriesQuery()

  console.log('data', data)

  return (
    <div>
      {!isEmpty ? (
        <FullHeightTableWrap>
          <Table
            data={data?.gitRepositories?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any Git repositories yet." />
      )}
    </div>
  )
}
