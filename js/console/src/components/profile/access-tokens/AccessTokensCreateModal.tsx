import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useState } from 'react'
import { Button, Codeline, Modal } from '@pluralsh/design-system'

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
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  const close = useCallback(() => {
    setOpen(false)
    setSelectedScopes([])
  }, [setOpen, setSelectedScopes])

  const [mutation, { data, loading, error }] = useCreateAccessTokenMutation({
    variables: {
      ...(selectedScopes.length > 0 && {
        scopes: [{ apis: selectedScopes, identifier: '*' }],
      }),
    },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: AccessTokensDocument,
        update: (prev) =>
          appendConnection(prev, data?.createAccessToken, 'accessTokens'),
      }),
  })

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!loading) mutation()
    },
    [loading, mutation]
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
            <div css={{ display: 'flex', flexGrow: 1 }} />
            <Button
              secondary
              type="button"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
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
          <AccessTokensCreateScope
            selectedScopes={selectedScopes}
            setSelectedScopes={setSelectedScopes}
          />
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
