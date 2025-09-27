import { Button, Modal } from '@pluralsh/design-system'
import {
  ComponentProps,
  FormEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  PersonaFragment,
  PolicyBinding,
  useUpdatePersonaMutation,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { useTheme } from 'styled-components'

import { GqlError } from '../../../utils/Alert'
import RoleFormBindings from '../roles/RoleFormBindings'

export function PersonaBindings({
  bindings,
  setBindings,
}: {
  bindings: Nullable<Nullable<PolicyBinding>[]>
  setBindings: (bindings: PolicyBinding[]) => void
}) {
  return (
    <RoleFormBindings
      bindings={bindings}
      setBindings={setBindings}
      showUsers={false}
      showGroups
      hints={{
        group: 'Groups to assign to this persona',
      }}
    />
  )
}

export const bindingsToBindingAttributes = (
  bindings: Nullable<PolicyBinding>[]
) =>
  bindings?.map((binding) => {
    if (binding?.group?.id) return { groupId: binding.group.id }
    if (binding?.user?.id) return { userId: binding.user.id }

    return null
  })

export function EditPersonaBindingsModal({
  persona,
  open,
  onClose,
}: {
  persona: PersonaFragment
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const [errorMsg, setErrorMsg] = useState<ReactNode>()
  const [bindings, setBindings] = useState(persona.bindings)

  const [mutation, { loading, error }] = useUpdatePersonaMutation({
    onCompleted: onClose,
  })

  useEffect(() => {
    setErrorMsg(
      error && (
        <GqlError
          header="Problem editing persona members"
          error={error}
        />
      )
    )
  }, [error])

  const allowSubmit = true

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault()
      if (bindings && allowSubmit) {
        mutation({
          variables: {
            id: persona.id,
            attributes: {
              bindings: bindingsToBindingAttributes(bindings),
            },
          },
        })
      }
    },
    [allowSubmit, bindings, mutation, persona.id]
  )

  return (
    <Modal
      header={<>Edit members of ‘{persona.name}’</>}
      open={open}
      size="large"
      asForm
      formProps={{ onSubmit }}
      onClose={onClose}
      onOpenAutoFocus={(e) => e.preventDefault()}
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.medium,
          }}
        >
          <Button
            disabled={!allowSubmit}
            loading={loading}
            type="submit"
          >
            Update
          </Button>
          <Button
            secondary
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <PersonaBindings {...{ bindings, setBindings }} />
        {errorMsg}
      </div>
    </Modal>
  )
}

export function EditPersonaBindings(
  props: ComponentProps<typeof EditPersonaBindingsModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <EditPersonaBindingsModal {...props} />
    </ModalMountTransition>
  )
}
