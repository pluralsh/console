import { createColumnHelper } from '@tanstack/react-table'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  AppIcon,
  Button,
  ClusterIcon,
  EmptyState,
  Table,
  usePrevious,
} from '@pluralsh/design-system'
import {
  type ClustersRowFragment,
  useClustersQuery,
  useCreateGitRepositoryMutation,
} from 'generated/graphql'
import { Edge } from 'utils/graphql'
import styled, { useTheme } from 'styled-components'
import {
  ComponentProps,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isEmpty } from 'lodash'
import { A } from 'honorable'
import { Link } from 'react-router-dom'

import ProviderIcon from '../utils/ProviderIcon'

import ModalAlt from './ModalAlt'
import { useCD } from './ContinuousDeployment'

function CreateCluster() {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const wasOpen = usePrevious(isOpen)
  const closeModal = useCallback(() => setIsOpen(false), [])
  const onClose = useCallback(() => setIsOpen(false), [])
  const [gitUrl, setGitUrl] = useState('')
  const [mutation, { loading, error }] = useCreateGitRepositoryMutation({
    variables: { attributes: { url: gitUrl } },
  })

  console.log('error', error)

  useEffect(() => {
    if (isOpen && wasOpen) {
      setGitUrl('')
    }
  }, [isOpen, wasOpen])
  const disabled = !gitUrl
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (gitUrl && !loading) {
        mutation()
      }
    },
    [gitUrl, loading, mutation]
  )

  return (
    <>
      <Button
        primary
        onClick={() => setIsOpen(true)}
      >
        Create cluster
      </Button>
      <ModalAlt
        header="Create a cluster"
        open={isOpen}
        portal
        onClose={onClose}
        asForm
        formProps={{ onSubmit }}
        actions={
          <>
            <Button
              type="submit"
              disabled={disabled}
              loading={loading}
              primary
            >
              Import
            </Button>
            <Button
              secondary
              onClick={closeModal}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xxsmall,
          }}
        >
          ...
        </div>
      </ModalAlt>
    </>
  )
}

const ColWithIconSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,

  '.content': {
    display: 'flex',
    flexDirection: 'column',
  },
}))

export function ColWithIcon({
  icon,
  children,
  ...props
}: ComponentProps<typeof ColWithIconSC>) {
  return (
    <ColWithIconSC {...props}>
      <AppIcon
        size="xxsmall"
        icon={icon}
      />
      <div className="content">{children}</div>
    </ColWithIconSC>
  )
}

const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()
const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => (
      <ColWithIcon icon={<ClusterIcon width={16} />}>
        <A
          as={Link}
          to="/cd/clusters/" // TODO: Update once details view is ready.
          whiteSpace="nowrap"
        >
          {getValue()}
        </A>
      </ColWithIcon>
    ),
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.provider?.name ?? '', {
    id: 'cloud',
    header: 'Cloud',
    cell: ({ getValue }) => (
      <ColWithIcon
        icon={
          <ProviderIcon
            provider={getValue()}
            width={16}
          />
        }
      >
        {getValue()}
      </ColWithIcon>
    ),
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'version',
    header: 'Version',
    cell: ({
      row: {
        original: { node },
      },
    }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <div>
          <div>Current: v{node?.currentVersion}</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
            }}
          >
            Desired: v{node?.version}
          </div>
        </div>
      )
    },
    meta: { truncate: true },
  }),
  // columnHelper.accessor(({ node }) => node?.version, {
  //   id: 'vpc',
  //   header: 'VPC ID',
  //   cell: () => 'TODO',
  //   meta: { truncate: true },
  // }),
  // columnHelper.accessor(({ node }) => node?.version, {
  //   id: 'owner',
  //   header: 'Owner',
  //   cell: () => (
  //     <UserDetails
  //       name="TODO"
  //       avatar={null}
  //       email="todo@todo.todo"
  //     />
  //   ),
  //   meta: { truncate: true },
  // }),
  columnHelper.accessor(({ node }) => node?.version, {
    id: 'cpu',
    header: 'CPU',
    cell: () => <div>TODO</div>,
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.version, {
    id: 'memory',
    header: 'Memory',
    cell: () => <div>TODO</div>,
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.version, {
    id: 'status',
    header: 'Status',
    cell: () => <div>TODO</div>,
    meta: { truncate: true },
  }),
]

export default function Clusters() {
  const { data } = useClustersQuery()
  const cd = useCD()

  const headerActions = useMemo(() => <CreateCluster />, [])

  useEffect(() => cd.setActionsContent(headerActions), [cd, headerActions])

  console.log('data', data)

  return (
    <div>
      {!isEmpty(data?.clusters?.edges) ? (
        <FullHeightTableWrap>
          <Table
            data={data?.clusters?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any CD clusters yet." />
      )}
    </div>
  )
}
