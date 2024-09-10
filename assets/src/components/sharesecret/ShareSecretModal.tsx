import {
  Button,
  Code,
  FormField,
  Input,
  Modal,
  ReturnIcon,
  Toast,
} from '@pluralsh/design-system'
import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import { LayerPositionType } from '@pluralsh/design-system/dist/components/Layer'

import { splitBindings } from '../settings/usermanagement/roles/RoleFormBindings'
import { BindingInput } from '../utils/BindingInput'

import {
  PolicyBindingFragment,
  useShareSecretMutation,
} from '../../generated/graphql'
import { isNonNullable } from '../../utils/isNonNullable'
import { bindingToBindingAttributes } from '../settings/usermanagement/roles/misc'

import { SECRETS_REL_PATH } from '../../routes/secretsRoutesConsts'

import { useShareSecretContext } from './ShareSecretContext'

const getUrl = (handle?: string) =>
  `https://${window.location.host}/${SECRETS_REL_PATH}/${handle}`

export default function ShareSecretModal() {
  const theme = useTheme()
  const { open, setOpen } = useShareSecretContext()
  const [completed, setCompleted] = useState(false)
  const [toast, setToast] = useState(false)
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [bindings, setBindings] = useState<
    Pick<PolicyBindingFragment, 'user' | 'group'>[]
  >([])
  const disabled = !name || !secret
  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => inputRef.current?.focus?.(), [])

  // TODO: Reset on each open.

  const { userBindings, groupBindings } = useMemo(() => {
    const { userBindings, groupBindings } = splitBindings(bindings)

    return {
      userBindings: (userBindings || []).map(({ user }) => user?.email),
      groupBindings: (groupBindings || []).map(({ group }) => group?.name),
    }
  }, [bindings])

  const [mutation, { loading, reset, data }] = useShareSecretMutation({
    onCompleted: (data) => {
      setCompleted(true)
      window.navigator.clipboard.writeText?.(getUrl(data.shareSecret?.handle)) // TODO: Test it.
      setToast(true)
      setTimeout(() => setToast(false), 3000)
    },
  })

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (disabled) return

      mutation({
        variables: {
          attributes: {
            name,
            secret,
            notificationBindings: bindings
              .filter(isNonNullable)
              .map(bindingToBindingAttributes),
          },
        },
      })
    },
    [bindings, disabled, mutation, name, secret]
  )

  const onRestart = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      reset()
      setCompleted(false)
    },
    [reset, setCompleted]
  )

  return (
    <>
      <Modal
        actions={
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.medium,
            }}
          >
            {completed ? (
              <>
                <Button
                  secondary
                  startIcon={<ReturnIcon />}
                  type="button"
                  onClick={onRestart}
                >
                  Restart
                </Button>
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Finish
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  secondary
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={disabled}
                  loading={loading}
                >
                  Generate secret
                </Button>
              </>
            )}
          </div>
        }
        asForm
        formProps={{ onSubmit }}
        header="Share secret"
        open={open}
        onClose={() => setOpen(false)}
        size="large"
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.large,
          }}
        >
          <FormField
            required={!completed}
            label="Secret name"
          >
            <Input
              disabled={completed}
              inputProps={{ ref: inputRef }}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          </FormField>
          <FormField
            required={!completed}
            label="Secret string"
          >
            <Input
              disabled={completed}
              value={secret}
              onChange={(e) => setSecret(e.currentTarget.value)}
            />
          </FormField>
          {completed ? (
            <Code css={{ minHeight: 54 }}>
              {getUrl(data?.shareSecret?.handle)}
            </Code>
          ) : (
            <>
              <BindingInput
                type="group"
                bindings={groupBindings}
                add={(group) => setBindings([...bindings, { group }])}
                remove={(name) =>
                  setBindings(
                    bindings.filter(
                      ({ group }) => !group || group.name !== name
                    )
                  )
                }
              />
              <BindingInput
                type="user"
                bindings={userBindings}
                add={(user) => setBindings([...bindings, { user }])}
                remove={(email) =>
                  setBindings(
                    bindings.filter(({ user }) => !user || user.email !== email)
                  )
                }
              />
            </>
          )}
        </div>
      </Modal>
      {toast && (
        // TODO: Set zIndex.
        <Toast
          position={'bottom' as LayerPositionType}
          onClose={() => setToast(false)}
          margin="large"
          severity="success"
        >
          Share secret URL copied!
        </Toast>
      )}
    </>
  )
}
