import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { Button, Codeline, Modal, Switch } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'

import {
  AccessTokensDocument,
  useCreateAccessTokenMutation,
} from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import { appendConnection, updateCache } from 'utils/graphql'

import { AccessTokensCreateScope } from './AccessTokensCreateScope'

export function AccessTokensCreateModal({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const theme = useTheme()
  const [addScopes, setAddScopes] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  const close = useCallback(() => {
    setOpen(false)
    setAddScopes(false)
    setSelectedScopes([])
  }, [setOpen, setAddScopes, setSelectedScopes])

  const [mutation, { data, loading, error }] = useCreateAccessTokenMutation({
    variables: {
      ...(addScopes && { scopes: [{ apis: selectedScopes }] }),
    },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: AccessTokensDocument,
        update: (prev) =>
          appendConnection(prev, data?.createAccessToken, 'accessTokens'),
      }),
  })

  const valid = useMemo(
    () => !addScopes || !isEmpty(selectedScopes),
    [addScopes, selectedScopes]
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
            <Button
              secondary
              type="button"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!valid}
              loading={loading}
              primary
            >
              Create
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
              <AccessTokensCreateScope
                selectedScopes={selectedScopes}
                setSelectedScopes={setSelectedScopes}
              />
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
