import { useApolloClient } from '@apollo/client'
import {
  Button,
  ComboBox,
  FormField,
  Modal,
  ValidatedInput,
} from '@pluralsh/design-system'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Flex, usePrevious } from 'honorable'

import { fetchUsers } from 'components/utils/BindingInput'

import { Actions } from 'components/utils/Actions'

import { useUpdateState } from 'components/hooks/useUpdateState'

import {
  Persona,
  PersonaMembersDocument,
  useCreatePersonaMemberMutation,
  useUpdatePersonaMutation,
} from 'generated/graphql'

import { GqlError } from '../../utils/Alert'

import PersonaMembers from './PersonaMembers'

export function EditPersonaMembers({
  persona,
  open,
  onClose,
}: {
  persona: Persona
  open: boolean
  onClose: (...args: any) => void
}) {
  const client = useApolloClient()
  const [userFilter, setUserFilter] = useState('')
  const [suggestions, setSuggestions] = useState<{ label: any; value: any }[]>(
    []
  )

  const [errorMsg, setErrorMsg] = useState<ReactNode>()
  const prevOpen = usePrevious(open)

  const [addMut, { loading, error }] = useCreatePersonaMemberMutation({
    variables: { personaId: persona.id } as any,
    refetchQueries: [
      { query: PersonaMembersDocument, variables: { id: persona.id } },
    ],
  })

  useEffect(() => {
    fetchUsers(client, userFilter, setSuggestions)
  }, [client, userFilter])

  const reset = useCallback(() => {
    setErrorMsg(undefined)
  }, [])

  useEffect(() => {
    if (open && open !== prevOpen) {
      reset()
    }
  })

  useEffect(() => {
    if (
      error?.graphQLErrors[0].message === 'persona_id has already been taken' ||
      error?.graphQLErrors[0].message.startsWith('constraint error')
    ) {
      setErrorMsg(undefined)

      return
    }
    setErrorMsg(
      error && (
        <GqlError
          header="Problem editing persona members"
          error={error}
        />
      )
    )
  }, [error])

  return (
    <Modal
      header={<>Edit members of ‘{persona.name}’</>}
      portal
      open={open}
      size="large"
      onClose={onClose}
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
              placeholder: 'Search a user inputProps',
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
        <PersonaMembers
          persona={persona}
          edit
        />
      </Flex>
    </Modal>
  )
}

export function EditPersonaAttributes({ persona, open, onClose }: any) {
  const prevOpen = usePrevious(open)
  const [errorMsg, setErrorMsg] = useState<ReactNode>()

  const {
    state: formState,
    reset: resetForm,
    update,
    hasUpdates,
  } = useUpdateState({
    name: persona.name,
    description: persona.description,
    users: [],
  })
  const { name, description } = formState

  const [mutation, { loading, error }] = useUpdatePersonaMutation({
    variables: { id: persona.id, attributes: { name, description } },
    onCompleted: onClose,
  })

  const reset = useCallback(() => {
    resetForm()
    setErrorMsg(undefined)
  }, [resetForm])

  useEffect(() => {
    if (open && open !== prevOpen) {
      reset()
    }
  })
  useEffect(() => {
    setErrorMsg(
      error && (
        <GqlError
          header="Problem editing persona attributes"
          error={error}
        />
      )
    )
  }, [error])

  return (
    <Modal
      header={<>Edit attributes of ‘{persona.name}’</>}
      portal
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
