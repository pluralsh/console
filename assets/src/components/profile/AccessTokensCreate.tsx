import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import { Button, Modal, Switch, Toast } from '@pluralsh/design-system'

import {
  AccessTokensDocument,
  useCreateAccessTokenMutation,
} from '../../generated/graphql'
import { GqlError } from '../utils/Alert'
import { appendConnection, updateCache } from '../../utils/graphql'

export function AccessTokensCreate() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [scopes, setScopes] = useState(false)
  const [displayNewBanner, setDisplayNewBanner] = useState(false)

  const [mutation, { loading, error }] = useCreateAccessTokenMutation({
    update: (cache, { data }) =>
      updateCache(cache, {
        query: AccessTokensDocument,
        update: (prev) =>
          appendConnection(prev, data?.createAccessToken, 'accessTokens'),
      }),
  })

  const disabled = false
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!disabled && !loading) {
        mutation()
      }
    },
    [disabled, loading, mutation]
  )

  const initialFocusRef = useRef<HTMLInputElement>()

  useEffect(() => {
    if (open) {
      initialFocusRef.current?.focus?.()
    }
  }, [open])

  return (
    <>
      <Button
        secondary
        onClick={() => setOpen(true)}
        loading={loading}
      >
        Create access token
      </Button>
      <Modal
        header="Create access token"
        open={open}
        portal
        onClose={() => setOpen(false)}
        asForm
        formProps={{ onSubmit }}
        actions={
          <div css={{ display: 'flex', gap: theme.spacing.small, flexGrow: 1 }}>
            <div css={{ display: 'flex', flexGrow: 1 }}>
              <Switch
                checked={scopes}
                onChange={(val) => setScopes(val)}
              >
                Configure scopes
              </Switch>
            </div>
            <Button
              type="submit"
              disabled={disabled}
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
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xsmall,
            }}
          >
            {/* <Input */}
            {/*  inputProps={{ ref: initialFocusRef }} */}
            {/*  value={gitUrl} */}
            {/*  onChange={(e) => { */}
            {/*    setGitUrl(e.currentTarget.value) */}
            {/*  }} */}
            {/*  placeholder="https://host.com/your-repo.git" */}
            {/*  titleContent={<GitHubLogoIcon />} */}
            {/* /> */}
          </div>
          {error && (
            <GqlError
              header="Problem importing repository"
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
          onClose={() => {
            setDisplayNewBanner(false)
          }}
        >
          New access token created.
        </Toast>
      )}
    </>
  )
}

//
// object :access_token_scope do
//   field :api,        non_null(:string)
// field :apis,       list_of(non_null(:string))
// field :identifier, :string
// field :ids,        list_of(non_null(:string))
// end
