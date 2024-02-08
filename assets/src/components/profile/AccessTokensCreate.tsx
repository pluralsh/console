import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { Button, Modal, Switch, Toast } from '@pluralsh/design-system'

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

export function AccessTokensCreate() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [hasScopes, setHasScopes] = useState(false)
  const [scopes, setScopes] = useState<Scope[]>([
    {
      apis: ['updateServiceDeployment', 'updateCluster'],
      ids: ['*'],
      valid: true,
    },
  ])
  const [displayNewBanner, setDisplayNewBanner] = useState(false)

  const [mutation, { loading, error }] = useCreateAccessTokenMutation({
    variables: { scopes },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: AccessTokensDocument,
        update: (prev) =>
          appendConnection(prev, data?.createAccessToken, 'accessTokens'),
      }),
    onCompleted: () => setOpen(false),
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

  const valid = useMemo(() => scopes.every((s) => !!s.valid), [scopes])
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (valid && !loading) {
        mutation()
      }
    },
    [valid, loading, mutation]
  )

  return (
    <>
      <Button
        secondary
        onClick={() => setOpen(true)}
      >
        Create access token
      </Button>
      <Modal
        header="Create access token"
        open={open}
        portal
        onClose={() => setOpen(false)}
        size="large"
        asForm
        formProps={{ onSubmit }}
        actions={
          <div css={{ display: 'flex', gap: theme.spacing.small, flexGrow: 1 }}>
            <div css={{ display: 'flex', flexGrow: 1 }}>
              <Switch
                checked={hasScopes}
                onChange={(val) => setHasScopes(val)}
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
            {hasScopes && (
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <>
          <p>Do you want to create new access token?</p>
          {hasScopes && (
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
                  index={index}
                  scope={scope}
                  setScope={(s: Scope) => setScope(s, index)}
                  canRemove={canRemoveScope}
                  remove={() => removeScope(index)}
                />
              ))}
            </>
          )}
          {error && (
            <GqlError
              header="Problem creating token."
              error={error}
            />
          )}
        </>
      </Modal>
      {displayNewBanner && (
        <Toast
          severity="success"
          marginBottom="medium"
          marginRight="xxxxlarge"
          onClose={() => setDisplayNewBanner(false)}
        >
          New access token created.
        </Toast>
      )}
    </>
  )
}
