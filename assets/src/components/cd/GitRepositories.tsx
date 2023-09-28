import { createColumnHelper } from '@tanstack/react-table'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  AppIcon,
  Button,
  ClusterIcon,
  Code,
  EmptyState,
  GitHubLogoIcon,
  Input,
  Table,
  usePrevious,
} from '@pluralsh/design-system'
import {
  type ClustersRowFragment,
  useCreateGitRepositoryMutation,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import {
  Edge,
  // removeConnection,
  // updateCache
} from 'utils/graphql'
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

import { useCD } from './ContinuousDeployment'
import ModalAlt from './ModalAlt'
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

const StepH = styled.h3(({ theme }) => ({
  ...theme.partials.text.body2Bold,
}))
const StepBody = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
}))
const StepLink = styled.a(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))

const scaffoldTabs = [
  {
    key: 'nodejs',
    label: 'Node.js',
    language: 'sh',
    content: `plural scaffold --type nodejs --name <my-service>`,
  },
  {
    key: 'rails',
    label: 'Rails',
    language: 'sh',
    content: `plural scaffold --type rails --name <my-service>`,
  },
  {
    key: 'springboot',
    label: 'Spring boot',
    language: 'sh',
    content: `plural scaffold --type springboot --name <my-service>`,
  },
  {
    key: 'django',
    label: 'Django',
    language: 'sh',
    content: `plural scaffold --type django --name <my-service>`,
  },
]

function ImportGit() {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const wasOpen = usePrevious(isOpen)
  const closeModal = useCallback(() => setIsOpen(false), [])
  const onClose = useCallback(() => {
    console.log('onClose')
    setIsOpen(false)
  }, [])
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
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Import Git
      </Button>
      <ModalAlt
        header="Import Git"
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
          <StepH>Step 1. Prepare your Git repository</StepH>
          <StepBody>
            Need some help to Git ready? Use a plural scaffold to get started or
            read our{' '}
            <StepLink
              href="https://docs.plural.sh/getting-started/quickstart"
              target="_blank"
            >
              quick start guide
            </StepLink>
            .
          </StepBody>
        </div>
        <Code tabs={scaffoldTabs} />
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
          }}
        >
          <StepH>Step 2. Connect your repository</StepH>
          <Input
            value={gitUrl}
            onChange={(e) => {
              setGitUrl(e.currentTarget.value)
            }}
            titleContent={<GitHubLogoIcon />}
          />
        </div>
      </ModalAlt>
    </>
  )
}

export default function Clusters() {
  const { data } = useGitRepositoriesQuery()
  const cd = useCD()

  const headerActions = useMemo(() => <ImportGit />, [])

  useEffect(() => {
    cd.setActionsContent(headerActions)
  }, [cd, headerActions])

  console.log('data', data)

  return (
    <div>
      {!isEmpty(data?.gitRepositories?.edges) ? (
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
