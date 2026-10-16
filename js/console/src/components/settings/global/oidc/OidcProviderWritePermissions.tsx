import { Button, Flex, Modal, PeopleIcon } from '@pluralsh/design-system'
import { StepBody } from 'components/cd/ModalAlt'
import { Permissions } from 'components/cd/utils/PermissionsModal'
import { bindingToBindingAttributes } from 'components/utils/bindings'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  OidcProviderFragment,
  OidcProviderType,
  PolicyBindingFragment,
  useUpdateOidcProviderMutation,
} from 'generated/graphql'
import { isEqual, uniqWith } from 'lodash'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

export function OidcProviderWritePermissions({
  provider,
}: {
  provider: OidcProviderFragment
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        secondary
        startIcon={<PeopleIcon />}
        onClick={() => setShowModal(true)}
      >
        Edit write permissions
      </Button>
      <OidcProviderWritePermissionsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        providerId={provider.id}
        bindings={provider.writeBindings}
        name={provider.name}
      />
    </>
  )
}

function OidcProviderWritePermissionsModal({
  providerId,
  bindings,
  name,
  open,
  onClose,
}: {
  providerId: string
  bindings: Nullable<Nullable<PolicyBindingFragment>[]>
  name: string
  open: boolean
  onClose: () => void
}) {
  // only the user's edits are stored; untouched lists show the current bindings
  const [editedWriteBindings, setWriteBindings] = useState<typeof bindings>()
  const writeBindings = editedWriteBindings ?? bindings
  const close = () => {
    setWriteBindings(undefined)
    onClose()
  }

  const uniqueWriteBindings = useMemo(
    () => uniqWith(writeBindings, isEqual).filter(isNonNullable),
    [writeBindings]
  )
  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useUpdateOidcProviderMutation({
      variables: {
        id: providerId,
        type: OidcProviderType.Console,
        attributes: {
          name,
          writeBindings: uniqueWriteBindings.map(bindingToBindingAttributes),
        },
      },
      refetchQueries: ['OidcProviders'],
      onCompleted: close,
    })
  const allowSubmit = !!writeBindings

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!allowSubmit) return
      mutation()
    },
    [allowSubmit, mutation]
  )

  return (
    <Modal
      header={`Write permissions for ${name}`}
      size="large"
      open={open}
      onClose={close}
      asForm
      formProps={{ onSubmit }}
      onOpenAutoFocus={(e) => e.preventDefault()}
      actions={
        <Flex
          gap="medium"
          justify="flex-end"
        >
          <Button
            secondary
            type="button"
            onClick={(e) => {
              e.preventDefault()
              close()
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!allowSubmit}
            loading={mutationLoading}
            primary
          >
            Save
          </Button>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="xlarge"
      >
        <StepBody>
          Bindings determining if a user can edit this OIDC client
        </StepBody>
        {!bindings ? (
          <LoadingIndicator />
        ) : (
          <Permissions
            permissionType="write"
            forLabel="OIDC client"
            bindings={uniqueWriteBindings}
            setBindings={setWriteBindings}
          />
        )}
        {mutationError && <GqlError error={mutationError} />}
      </Flex>
    </Modal>
  )
}
