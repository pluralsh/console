import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { Button, Codeline, Modal, Switch } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'

import {
  AccessTokensDocument,
  useCreateAccessTokenMutation,
} from '../../generated/graphql'
import { GqlError } from '../utils/Alert'
import { appendConnection, updateCache } from '../../utils/graphql'

import { AccessTokensCreateScope } from './AccessTokensCreateScope'

export type Scope = {
  apis: string[]
  ids: string[]
  valid?: boolean
}

export function AccessTokensCreateModal({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const theme = useTheme()
  const [addScopes, setAddScopes] = useState(false)
  const [scopes, setScopes] = useState<Scope[]>([{ apis: [], ids: [] }])

  const close = useCallback(() => {
    setOpen(false)
    setAddScopes(false)
    setScopes([{ apis: [], ids: [] }])
  }, [setOpen, setAddScopes, setScopes])

  const [mutation, { data, loading, error }] = useCreateAccessTokenMutation({
    variables: {
      scopes: addScopes
        ? scopes.map(({ apis, ids }) => ({ apis, ids }))
        : undefined,
    },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: AccessTokensDocument,
        update: (prev) =>
          appendConnection(prev, data?.createAccessToken, 'accessTokens'),
      }),
  })

  const addScope = useCallback(() => {
    setScopes([...scopes, { apis: [], ids: [] }])
  }, [scopes, setScopes])
  const setScope = useCallback(
    (s: Scope, i: number) => {
      const nextScopes = [...scopes]

      nextScopes[i] = s
      nextScopes[i].valid = !isEmpty(nextScopes[i].apis)

      setScopes(nextScopes)
    },
    [scopes, setScopes]
  )
  const canRemoveScope = scopes.length > 1
  const removeScope = useCallback(
    (idx: number) => {
      if (scopes.length < 2) return

      setScopes(scopes.filter((_, i) => i !== idx))
    },
    [scopes, setScopes]
  )

  const valid = useMemo(
    () => !addScopes || scopes.every((s) => !!s.valid),
    [addScopes, scopes]
  )
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (valid && !loading) mutation()
    },
    [valid, loading, mutation]
  )

  return (
    <Modal
      header="Create access token"
      open={open}
      onClose={close}
      size="large"
      asForm
      formProps={{ onSubmit }}
      actions={
        data ? (
          <Button
            type="button"
            secondary
            onClick={close}
          >
            Close
          </Button>
        ) : (
          <div css={{ display: 'flex', gap: theme.spacing.small, flexGrow: 1 }}>
            <div css={{ display: 'flex', flexGrow: 1 }}>
              <Switch
                checked={addScopes}
                onChange={(val) => setAddScopes(val)}
              >
                <div
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xsmall,
                  }}
                >
                  Configure access scopes
                </div>
              </Switch>
            </div>
            {addScopes && (
              <Button
                secondary
                onClick={addScope}
              >
                Add scope
              </Button>
            )}
            <Button
              type="submit"
              disabled={!valid}
              loading={loading}
              primary
            >
              Create
            </Button>
            <Button
              type="button"
              secondary
              onClick={close}
            >
              Cancel
            </Button>
          </div>
        )
      }
    >
      {data ? (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.large,
          }}
        >
          <p>
            New access token created. Make sure to copy it now as you will not
            be able to see it again.
          </p>
          <Codeline>{data.createAccessToken?.token}</Codeline>
        </div>
      ) : (
        <>
          <p>Do you want to create new access token?</p>
          {addScopes && (
            <>
              <div
                css={{
                  ...theme.partials.text.body2,
                  color: theme.colors['text-light'],
                  marginTop: theme.spacing.small,
                }}
              />
              {scopes.map((scope, index) => (
                <AccessTokensCreateScope
                  scope={scope}
                  setScope={(s: Scope) => setScope(s, index)}
                  canRemove={canRemoveScope}
                  remove={() => removeScope(index)}
                />
              ))}
            </>
          )}
          {error && (
            <div css={{ marginTop: theme.spacing.medium }}>
              <GqlError
                header="Problem creating token"
                error={error}
              />
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
