import { ReactElement, useCallback, useState } from 'react'
import {
  Button,
  Chip,
  ComboBox,
  FormField,
  ListBoxFooterPlus,
  ListBoxItem,
  ListBoxItemChipList,
  Modal,
  Select,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { PR_QUERY_PAGE_SIZE } from './PrScmManagement.tsx'
import { scmTypeToIcon } from './PrScmConnectionsColumns'
import { useUpdateState } from 'components/hooks/useUpdateState.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { ModalMountTransition } from 'components/utils/ModalMountTransition.tsx'
import {
  useScmConnectionsQuery,
  useGitRepositoriesQuery,
  useSetupRenovateMutation,
  SetupRenovateMutationVariables,
} from 'generated/graphql.ts'
import { RegExpGroups } from 'types/regex.ts'
import { extendConnection } from 'utils/graphql.ts'

const REPOSITORY_EXTRACT_REGEX =
  /(?<userOrOrg>[^/:]+)\/(?<repository>[^/]+)?\.git$/

interface SetupDependencyAutomationFormProps {
  formState: Partial<SetupRenovateAttributes>
  updateFormState: (update: Partial<SetupRenovateAttributes>) => void
}

function SetupDependencyAutomationForm({
  formState,
  updateFormState,
}: SetupDependencyAutomationFormProps) {
  const theme = useTheme()
  const [repository, setRepository] = useState('')

  const onRepositorySelection = useCallback(
    (repository: string) => {
      if (!repository) {
        return
      }

      updateFormState({
        repos: Array.from(
          new Set([...(formState.repos ?? []), repository]).values()
        ),
      })
      setRepository('')
    },
    [formState.repos, updateFormState]
  )

  const {
    error: scmConnectionsError,
    fetchMore: fetchMoreSCMConnections,
    data: scmData,
    previousData: previousSCMData,
  } = useScmConnectionsQuery({
    variables: {
      first: PR_QUERY_PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })

  const scmConnections =
    scmData?.scmConnections ?? previousSCMData?.scmConnections
  const scmConnectionsPageInfo = scmConnections?.pageInfo
  const fetchNextSCMConnections = useCallback(() => {
    if (!scmConnectionsPageInfo?.endCursor) {
      return
    }

    fetchMoreSCMConnections({
      variables: { after: scmConnectionsPageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.scmConnections,
          'scmConnections'
        ),
    })
  }, [fetchMoreSCMConnections, scmConnectionsPageInfo?.endCursor])

  const {
    error: repositoriesError,
    fetchMore: fetchMoreRepositories,
    data: repositoriesData,
    previousData: previousRepositoriesData,
  } = useGitRepositoriesQuery()

  const repositories =
    repositoriesData?.gitRepositories ??
    previousRepositoriesData?.gitRepositories
  const repositoriesPageInfo = repositories?.pageInfo
  const fetchNextRepositories = useCallback(() => {
    if (!repositoriesPageInfo?.endCursor) {
      return
    }

    fetchMoreRepositories({
      variables: { after: repositoriesPageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.gitRepositories,
          'gitRepositories'
        ),
    })
  }, [fetchMoreRepositories, repositoriesPageInfo?.endCursor])

  const toRepositoryName = useCallback((url: string) => {
    const { userOrOrg, repository } =
      (
        REPOSITORY_EXTRACT_REGEX.exec(url) as RegExpGroups<
          'userOrOrg' | 'repository'
        >
      )?.groups ?? {}

    return `${userOrOrg}/${repository}`
  }, [])

  const toServiceName = useCallback(
    (scmConnectionID: string): string => {
      const scm = scmConnections?.edges?.find(
        (scm) => scm!.node!.id === scmConnectionID
      )

      return `dependency-automation-${scm?.node?.name ?? Math.random().toString(36).substring(2, 9)}`
    },
    [scmConnections?.edges]
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {scmConnectionsError && <GqlError error={scmConnectionsError} />}
      {repositoriesError && <GqlError error={repositoriesError} />}
      <FormField
        label="SCM connection"
        required
      >
        <Select
          label="Select SCM connection"
          selectedKey={formState.connectionId}
          leftContent={
            scmTypeToIcon[
              scmConnections?.edges?.find(
                (scm) => scm?.node?.id === formState.connectionId
              )?.node?.type || ''
            ]
          }
          onSelectionChange={(key) =>
            updateFormState({
              connectionId: key as string,
              name: toServiceName(key as string),
            })
          }
          dropdownFooterFixed={
            scmConnectionsPageInfo?.hasNextPage && (
              <ListBoxFooterPlus onClick={fetchNextSCMConnections}>
                Load more
              </ListBoxFooterPlus>
            )
          }
        >
          {scmConnections?.edges?.map((scm) => (
            <ListBoxItem
              key={scm!.node!.id}
              leftContent={scmTypeToIcon[scm!.node!.type]}
              label={scm!.node!.name}
            />
          )) ?? []}
        </Select>
      </FormField>

      <FormField
        label="Repositories"
        required
      >
        <ComboBox
          inputValue={repository}
          onInputChange={(key) => setRepository(key as string)}
          onSelectionChange={(key) => onRepositorySelection(key as string)}
          inputProps={{
            placeholder: 'Select repositories',
          }}
          dropdownFooterFixed={
            repositoriesPageInfo?.hasNextPage && (
              <ListBoxFooterPlus onClick={fetchNextRepositories}>
                Load more
              </ListBoxFooterPlus>
            )
          }
        >
          {repositories?.edges?.map((repo) => (
            <ListBoxItem
              key={toRepositoryName(repo!.node!.url!)}
              label={toRepositoryName(repo!.node!.url!)}
            />
          )) ?? []}
        </ComboBox>
        {!(formState?.repos?.length === 0) && (
          <ListBoxItemChipList
            css={{
              justifyContent: 'start',
              marginTop: theme.spacing.xsmall,
            }}
            maxVisible={Infinity}
            chips={
              formState?.repos?.map((key) => (
                <Chip
                  fillLevel={2}
                  size="small"
                  clickable
                  onClick={() => {
                    const newKeys = new Set(formState.repos)

                    newKeys.delete(key)
                    updateFormState({ repos: Array.from(newKeys.values()) })
                  }}
                  closeButton
                >
                  {key}
                </Chip>
              )) ?? []
            }
          />
        )}
      </FormField>
    </div>
  )
}

interface SetupDependencyAutomationModalProps {
  open: boolean
  refetch: Nullable<() => void>
  onClose: () => void
}

interface SetupRenovateAttributes {
  connectionId: string
  repos: Array<string>
  name?: string
}

function SetupDependencyAutomationModal({
  open,
  refetch,
  onClose,
}: SetupDependencyAutomationModalProps): ReactElement<any> {
  const theme = useTheme()
  const { state: formState, update: updateFormState } = useUpdateState<
    Partial<SetupRenovateAttributes>
  >({
    connectionId: '',
    repos: [],
  } as SetupRenovateAttributes)

  const [mutation, { loading, error }] = useSetupRenovateMutation({
    onCompleted: () => {
      onClose?.()
      refetch?.()
    },
  })

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      mutation({
        variables: formState as SetupRenovateMutationVariables,
      })
    },
    [formState, mutation]
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      asForm
      header="Setup Dependency Automation"
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.small,
          }}
        >
          <Button
            loading={loading}
            primary
            disabled={!formState?.repos?.length || !formState.connectionId}
            onClick={onSubmit}
          >
            Create
          </Button>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </div>
      }
    >
      {error && (
        <div
          css={{
            marginBottom: theme.spacing.small,
          }}
        >
          <GqlError error={error} />
        </div>
      )}
      <SetupDependencyAutomationForm
        formState={formState}
        updateFormState={updateFormState}
      />
    </Modal>
  )
}

export function SetupDependencyAutomation({
  refetch,
}: {
  refetch: Nullable<() => void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        secondary
        onClick={() => setOpen(true)}
      >
        Setup dependency automation
      </Button>
      <ModalMountTransition open={open}>
        <SetupDependencyAutomationModal
          open={open}
          refetch={refetch}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
