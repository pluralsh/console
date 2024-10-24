import { useApolloClient } from '@apollo/client'
import {
  Button,
  ComboBox,
  FormField,
  Modal,
  ValidatedInput,
} from '@pluralsh/design-system'
import { Flex } from 'honorable'
import { ComponentProps, ReactNode, useEffect, useState } from 'react'

import { fetchUsers } from 'components/utils/BindingInput'

import { Actions } from 'components/utils/Actions'

import { useUpdateState } from 'components/hooks/useUpdateState'

import {
  Group,
  GroupMembersDocument,
  useCreateGroupMemberMutation,
  useUpdateGroupMutation,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { GqlError } from '../../../utils/Alert'

import GroupMembers from './GroupMembers'

export function EditGroupMembers({
  ...props
}: ComponentProps<typeof EditGroupMembersModal>) {
  return (
    <ModalMountTransition open={props.open}>
      <EditGroupMembersModal {...props} />
    </ModalMountTransition>
  )
}

export function EditGroupAttributes({
  ...props
}: ComponentProps<typeof EditGroupAttributesModal>) {
  return (
    <ModalMountTransition open={props.open}>
      <EditGroupAttributesModal {...props} />
    </ModalMountTransition>
  )
}

function EditGroupMembersModal({
  group,
  open,
  onClose,
}: {
  group: Group
  open: boolean
  onClose: (...args: any) => void
}) {
  const client = useApolloClient()
  const [userFilter, setUserFilter] = useState('')
  const [suggestions, setSuggestions] = useState<{ label: any; value: any }[]>(
    []
  )

  const [errorMsg, setErrorMsg] = useState<ReactNode>()

  const [addMut, { loading, error }] = useCreateGroupMemberMutation({
    variables: { groupId: group.id } as any,
    refetchQueries: [
      { query: GroupMembersDocument, variables: { id: group.id } },
    ],
  })

  useEffect(() => {
    fetchUsers(client, userFilter, setSuggestions)
  }, [client, userFilter])

  useEffect(() => {
    if (
      error?.graphQLErrors[0].message === 'group_id has already been taken' ||
      error?.graphQLErrors[0].message.startsWith('constraint error')
    ) {
      setErrorMsg(undefined)

      return
    }
    setErrorMsg(
      error && (
        <GqlError
          header="Problem editing group members"
          error={error}
        />
      )
    )
  }, [error])

  return (
    <Modal
      header={<>Edit members of ‘{group.name}’</>}
      open={open}
      size="large"
      onClose={onClose}
      onOpenAutoFocus={(e) => e.preventDefault()}
      actions={
        <Button
          onClick={onClose}
          loading={loading}
        >
          Done
        </Button>
      }
    >
      <Flex
        flexDirection="column"
        gap="large"
      >
        {errorMsg}
        <GroupMembers
          group={group}
          edit
          skip={!open}
        />
        <FormField
          label="Add users"
          width="100%"
          {...{
            '& :last-child': {
              marginTop: 0,
            },
          }}
        >
          <ComboBox
            // isOpen
            inputProps={{
              value: userFilter,
              placeholder: 'Search a user',
            }}
            inputValue={userFilter}
            // @ts-expect-error
            placeholder="Search a user"
            onSelectionChange={(key) => {
              setUserFilter('')
              if (key && typeof key === 'string') {
                // @ts-expect-error
                addMut({ variables: { userId: key } })
              }
            }}
            onInputChange={(value) => {
              setUserFilter(value)
            }}
          >
            {suggestions.map(({ label }) => label)}
          </ComboBox>
        </FormField>
      </Flex>
    </Modal>
  )
}

function EditGroupAttributesModal({ group, open, onClose }: any) {
  const [errorMsg, setErrorMsg] = useState<ReactNode>()

  const {
    state: formState,
    update,
    hasUpdates,
  } = useUpdateState({
    name: group.name,
    description: group.description,
    users: [],
  })
  const { name, description } = formState

  const [mutation, { loading, error }] = useUpdateGroupMutation({
    variables: { id: group.id, attributes: { name, description } },
    onCompleted: onClose,
  })

  useEffect(() => {
    setErrorMsg(
      error && (
        <GqlError
          header="Problem editing group attributes"
          error={error}
        />
      )
    )
  }, [error])

  return (
    <Modal
      header={<>Edit attributes of ‘{group.name}’</>}
      open={open}
      size="large"
      onClose={onClose}
      actions={
        <Actions
          cancel={onClose}
          submit={hasUpdates ? () => mutation() : undefined}
          loading={loading}
          action="Update"
        />
      }
    >
      <Flex
        flexDirection="column"
        gap="large"
      >
        {errorMsg}
        <ValidatedInput
          label="Name"
          value={name}
          onChange={({ target: { value } }) => update({ name: value })}
        />
        <ValidatedInput
          label="Description"
          value={description}
          onChange={({ target: { value } }) => update({ description: value })}
        />
      </Flex>
    </Modal>
  )
}
