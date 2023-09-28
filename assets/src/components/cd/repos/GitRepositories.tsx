import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  AppIcon,
  Chip,
  EmptyState,
  Table,
  WrapWithIf,
} from '@pluralsh/design-system'
import {
  AuthMethod,
  GitHealth,
  type GitRepositoriesRowFragment,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { ComponentProps, useEffect, useMemo, useState } from 'react'
import { isEmpty } from 'lodash'

// import classNames from 'classnames'

import classNames from 'classnames'

import { Merge } from 'type-fest'

import { Confirm } from 'components/utils/Confirm'

import { DeleteIconButton } from 'components/utils/IconButtons'

import { createMapperWithFallback } from 'utils/mapping'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useCD } from '../ContinuousDeployment'

import { columns } from './GitRepositoriesColumns'
import { ImportGit } from './GitRepositoriesImportGit'
// import { Confirm } from 'components/utils/Confirm'
// import { DeleteIconButton } from 'components/utils/IconButtons'

const ColWithIconSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  alignItems: 'center',
  '.icon': {
    '&, *': {
      width: 'unset',
      overflow: 'unset',
      whiteSpace: 'unset',
    },
  },
  '.content': {
    '&.truncateLeft': {
      direction: 'rtl',
      textAlign: 'left',
      span: {
        direction: 'ltr',
        unicodeBidi: 'bidi-override',
      },
    },
  },
}))

export function ColWithIcon({
  icon,
  children,
  truncateLeft = false,
  ...props
}: Merge<
  ComponentProps<typeof ColWithIconSC>,
  {
    icon: string | ComponentProps<typeof AppIcon>['icon']
    truncateLeft?: boolean
  }
>) {
  return (
    <ColWithIconSC {...props}>
      <div className="icon">
        <AppIcon
          spacing="padding"
          size="xxsmall"
          icon={typeof icon !== 'string' ? icon : undefined}
          url={typeof icon === 'string' ? icon : undefined}
        />
      </div>
      <div className={classNames('content', { truncateLeft: 'truncateLeft' })}>
        <WrapWithIf
          condition={truncateLeft}
          wrapper={<span />}
        >
          {children}
        </WrapWithIf>
      </div>
    </ColWithIconSC>
  )
}

// Will need to update once delete mutation exists in API
export function DeleteGitRepository({
  repo,
}: {
  repo: Pick<GitRepositoriesRowFragment, 'id' | 'url'>
}) {
  const theme = useTheme()
  const [confirm, setConfirm] = useState(false)
  //   const [mutation, { loading, error }] = useDeleteGitRepositoryMutation({
  //     variables: { id: repo.id ?? '' },
  //     update: (cache, { data }) =>
  //       updateCache(cache, {
  //         query: GitRepositoriesDocument,
  //         update: (prev) =>
  //           removeConnection(prev, data?.deleteGitRepository, 'gitRepositories'),
  //       }),
  //     onCompleted: () => setConfirm(false),
  //   })

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
            <p>TODO: There is no delete mutation yet</p>
            <p>Are you sure you want to delete this Git repository?"</p>
            <p>{repo.url}</p>
          </div>
        }
        close={() => setConfirm(false)}
        submit={() => {
          alert('No mutation yet. Repo will NOT be deleted')
          setConfirm(false)
        }}
        // submit={() => mutation()}
        // loading={loading}
        destructive
        // error={error}
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

export default function GitRepositories() {
  const { data } = useGitRepositoriesQuery()
  const cd = useCD()

  const headerActions = useMemo(() => <ImportGit />, [])

  useEffect(() => {
    cd.setActionsContent(headerActions)
  }, [cd, headerActions])

  console.log('data', data)
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <>
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
    </>
  )
}
