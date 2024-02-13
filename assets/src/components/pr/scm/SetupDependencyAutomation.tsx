import { ReactElement, useCallback, useState } from 'react'
import {
  Button,
  Chip,
  FormField,
  Input,
  ListBoxFooterPlus,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ModalMountTransition } from '../../utils/ModalMountTransition'
import { useScmConnectionsQuery } from '../../../generated/graphql'
import { extendConnection } from '../../../utils/graphql'
import { GqlError } from '../../utils/Alert'
import { useUpdateState } from '../../hooks/useUpdateState'

import { PR_QUERY_PAGE_SIZE } from './PrScmConnections'
import { scmTypeToIcon } from './PrScmConnectionsColumns'

interface SetupDependencyAutomationFormProps {
  formState: SetupRenovateAttributes
  updateFormState: (update: Partial<SetupRenovateAttributes>) => void
}

function SetupDependencyAutomationForm({
  formState,
  updateFormState,
}: SetupDependencyAutomationFormProps) {
  const theme = useTheme()
  const [repository, setRepository] = useState('')

  const addRepository = useCallback(
    (repository) => {
      if (!repository || formState.repos?.find((repo) => repo === repository)) {
        setRepository('')

        return
      }

      updateFormState({ repos: [...(formState.repos ?? []), repository] })
      setRepository('')
    },
    [formState.repos, updateFormState]
  )

  const removeRepository = useCallback(
    (repository) => {
      if (!repository) {
        return
      }

      updateFormState({
        repos: formState.repos?.filter((repo) => repo !== repository) ?? [],
      })
    },
    [formState.repos, updateFormState]
  )

  const {
    error,
    fetchMore,
    data: currentData,
    previousData,
  } = useScmConnectionsQuery({
    variables: {
      first: PR_QUERY_PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })

  const data = currentData || previousData
  const scmConnections = data?.scmConnections
  const pageInfo = scmConnections?.pageInfo
  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.scmConnections,
          'scmConnections'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {error && <GqlError error={error} />}
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
          onSelectionChange={(key) => updateFormState({ connectionId: key })}
          dropdownFooterFixed={
            pageInfo?.hasNextPage && (
              <ListBoxFooterPlus onClick={fetchNextPage}>
                Load more
              </ListBoxFooterPlus>
            )
          }
        >
          {scmConnections?.edges?.map((scm) => (
            <ListBoxItem
              key={scm?.node?.id}
              leftContent={scmTypeToIcon[scm?.node?.type]}
              label={scm?.node?.name}
            />
          ))}
        </Select>
      </FormField>

      <FormField
        label="Repositories"
        required
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.small,
            marginBottom: theme.spacing.xsmall,
          }}
        >
          <Input
            placeholder="pluralsh/cd-demo"
            onChange={(event) => setRepository(event.target.value)}
            value={repository}
            width="100%"
          />
          <Button
            secondary
            onClick={() => addRepository(repository)}
          >
            Add
          </Button>
        </div>
        <div
          css={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.xsmall,
          }}
        >
          {formState.repos?.map((repository) => (
            <Chip
              fillLevel={2}
              clickable
              closeButton
              onClick={() => removeRepository(repository)}
            >
              {repository}
            </Chip>
          ))}
        </div>
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
}

function SetupDependencyAutomationModal({
  open,
  refetch,
  onClose,
}: SetupDependencyAutomationModalProps): ReactElement {
  const theme = useTheme()
  const { state: formState, update: updateFormState } =
    useUpdateState<SetupRenovateAttributes>({
      connectionId: '',
      repos: [],
    } as SetupRenovateAttributes)

  const onSubmit = useCallback((e) => {
    e.preventDefault()
  }, [])

  return (
    <Modal
      portal
      open={open}
      onClose={onClose}
      asForm
      onSubmit={onSubmit}
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
            // loading={loading}
            primary
            disabled={formState.repos?.length < 1 || !formState.connectionId}
            type="submit"
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
      <SetupDependencyAutomationForm
        formState={formState}
        updateFormState={updateFormState}
      />
      {/* <ScmConnectionForm */}
      {/*  {...{ type: 'create', formState, updateFormState, error }} */}
      {/* /> */}
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
