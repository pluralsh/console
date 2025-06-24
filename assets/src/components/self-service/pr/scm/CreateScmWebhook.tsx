import {
  Button,
  Codeline,
  Flex,
  FormField,
  Input2,
  Modal,
  PlusIcon,
} from '@pluralsh/design-system'
import { useCallback, useState } from 'react'
import { useTheme } from 'styled-components'

import {
  ScmType,
  ScmWebhookAttributes,
  useCreateScmWebhookPointerMutation,
} from 'generated/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { GqlError } from 'components/utils/Alert'

import { Body2P } from 'components/utils/typography/Text'

import GitProviderSelect from './GitProviderSelect'

const DEFAULT_ATTRIBUTES: Partial<ScmWebhookAttributes> = {
  hmac: '',
  type: ScmType.Github,
  owner: '',
}

export function CreateScmWebhookModal({
  refetch,
  open,
  onClose,
}: {
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const { state: formState, update: updateFormState } =
    useUpdateState<Partial<ScmWebhookAttributes>>(DEFAULT_ATTRIBUTES)

  const [mutation, { data, loading, error }] =
    useCreateScmWebhookPointerMutation({
      onCompleted: () => {
        refetch?.()
      },
    })

  const newWebHook = data?.createScmWebhookPointer
  const { hmac, owner, type } = formState
  const allowSubmit = hmac && owner && type
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      if (allowSubmit) {
        const attributes: ScmWebhookAttributes = {
          hmac,
          owner,
          type,
        }

        mutation({ variables: { attributes } })
      }
    },
    [hmac, owner, type, allowSubmit, mutation]
  )

  return (
    <Modal
      open={open}
      onClose={onClose || undefined}
      asForm={!newWebHook}
      onSubmit={onSubmit}
      header="Create a new webhook"
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.small,
          }}
        >
          {!newWebHook && (
            <Button
              loading={loading}
              primary
              disabled={!allowSubmit}
              type="submit"
            >
              Create
            </Button>
          )}
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            {newWebHook || error ? 'Close' : 'Cancel'}
          </Button>
        </div>
      }
    >
      <Flex
        flexDirection="column"
        gap="large"
      >
        {error && (
          <GqlError
            header="Something went wrong"
            error={error}
          />
        )}
        {newWebHook && !error && (
          <>
            <Body2P>
              Add a new webhook in your source control provider with the
              following url and validation secret
            </Body2P>
            <FormField label="Webhook URL">
              <Codeline>{newWebHook.url}</Codeline>
            </FormField>
            <FormField label="Secret">
              <Codeline>{hmac}</Codeline>
            </FormField>
          </>
        )}
        {!newWebHook && !error && (
          <>
            <GitProviderSelect
              selectedKey={formState.type}
              updateSelectedKey={(type) => updateFormState({ type })}
            />
            <FormField
              label={formState?.type === ScmType.Gitlab ? `Group` : 'Owner'}
              hint={
                formState?.type === ScmType.Github
                  ? 'should be a GitHub organization or repo slug'
                  : ''
              }
              required
            >
              <Input2
                value={formState.owner}
                onChange={(e) => updateFormState({ owner: e.target.value })}
              />
            </FormField>
            <FormField
              label="Secret"
              hint={
                formState?.type === ScmType.Github
                  ? 'a secure random string, will be added as the GitHub webhook secret'
                  : ''
              }
              required
            >
              <Input2
                value={formState.hmac}
                onChange={(e) => updateFormState({ hmac: e.target.value })}
              />
            </FormField>
          </>
        )}
      </Flex>
    </Modal>
  )
}

export function CreateScmWebhook({
  refetch,
}: {
  refetch: Nullable<() => void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        small
        endIcon={<PlusIcon />}
        onClick={() => setOpen(true)}
      >
        Create webhook
      </Button>
      <ModalMountTransition open={open}>
        <CreateScmWebhookModal
          open={open}
          refetch={refetch}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
