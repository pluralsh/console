import {
  Button,
  Code,
  FormField,
  Input,
  Modal,
  ReturnIcon,
  Toast,
} from '@pluralsh/design-system'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTheme } from 'styled-components'

import { BindingInput } from '../utils/BindingInput'

import {
  PolicyBindingFragment,
  useShareSecretMutation,
} from '../../generated/graphql'
import { isNonNullable } from '../../utils/isNonNullable'

import { SECRETS_PATH } from '../../routes/secretsRoutesConsts'
import {
  bindingToBindingAttributes,
  splitBindings,
} from 'components/utils/bindings'

const getUrl = (handle?: string) =>
  `https://${window.location.host}/${SECRETS_PATH}/${handle}`

export default function ShareSecretModal({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
  const [completed, setCompleted] = useState(false)
  const [toast, setToast] = useState(false)
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [bindings, setBindings] = useState<
    Pick<PolicyBindingFragment, 'user' | 'group'>[]
  >([])
  const disabled = !name || !secret
  const toastRef = useRef<HTMLElement>(undefined)

  useEffect(() => {
    if (toastRef.current)
      toastRef.current.style.setProperty('z-index', `${theme.zIndexes.tooltip}`)
  }, [theme.zIndexes.tooltip, toast])

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

      navigator.clipboard
        .writeText(getUrl(data.shareSecret?.handle))
        .then(() => setToast(true))
        .catch((e) => console.error("Couldn't copy URL to clipboard", e))
    },
  })

  const onSubmit = useCallback(() => {
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
  }, [bindings, disabled, mutation, name, secret])

  const onRestart = useCallback(() => {
    reset()
    setCompleted(false)
  }, [reset, setCompleted])

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
                  onClick={onRestart}
                >
                  Restart
                </Button>
                <Button onClick={() => setOpen(false)}>Finish</Button>
              </>
            ) : (
              <>
                <Button
                  secondary
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={disabled}
                  loading={loading}
                >
                  Generate secret
                </Button>
              </>
            )}
          </div>
        }
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
          <FormField label="Secret name">
            <Input
              disabled={completed}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          </FormField>
          <FormField label="Secret string">
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
        <Toast
          position={'bottom'}
          onClose={() => setToast(false)}
          margin="large"
          severity="success"
          ref={toastRef}
        >
          Share secret URL copied!
        </Toast>
      )}
    </>
  )
}
