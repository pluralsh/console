import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import {
  Button,
  Card,
  FormField,
  Input,
  Modal,
  Switch,
  Toast,
} from '@pluralsh/design-system'

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
  const [api, setApi] = useState('api')

  const [mutation, { loading, error }] = useCreateAccessTokenMutation({
    update: (cache, { data }) =>
      updateCache(cache, {
        query: AccessTokensDocument,
        update: (prev) =>
          appendConnection(prev, data?.createAccessToken, 'accessTokens'),
      }),
    onCompleted: () => setOpen(false),
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
    if (open) initialFocusRef.current?.focus?.()
  }, [open])

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
          {scopes && (
            <Card
              css={{
                '&&': {
                  marginTop: theme.spacing.medium,
                  padding: theme.spacing.medium,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.medium,
                },
              }}
            >
              <FormField label="APIs">
                <Input
                  inputProps={{ ref: initialFocusRef }}
                  value={api}
                  onChange={(e) => {
                    setApi(e.currentTarget.value)
                  }}
                />
              </FormField>
              <FormField label="IDs">
                <Input
                  inputProps={{ ref: initialFocusRef }}
                  value={api}
                  onChange={(e) => {
                    setApi(e.currentTarget.value)
                  }}
                />
              </FormField>
            </Card>
          )}
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
//    test "a user can create an access token with scopes" do
//       user = insert(:user)
//
//       {:ok, token} = Users.create_access_token(%{
//         scopes: [%{api: "updateServiceDeployment", identifier: Ecto.UUID.generate()}]
//       }, user)
//
//       assert token.token
//       assert token.user_id == user.id
//       [scope] = token.scopes
//       assert scope.api == "updateServiceDeployment"
//    test "it will match by wildcard" do
//       scope = build(:scope, ids: ["*"], apis: ["updateService"])
//       assert AccessTokens.scopes_match?([scope], "updateService", "id")
//       refute AccessTokens.scopes_match?([scope], "updateCluster", "id")
//       assert AccessTokens.scopes_match?([scope], "updateService", "id2")
//
//       scope = build(:scope, identifier: "*", apis: ["updateService"])
//       assert AccessTokens.scopes_match?([scope], "updateService", "id")
//       refute AccessTokens.scopes_match?([scope], "updateCluster", "id")
//       assert AccessTokens.scopes_match?([scope], "updateService", "id2")
//     end
//
//     test "it will ignore nils" do
//       scope = build(:scope)
//       assert AccessTokens.scopes_match?([scope], "updateService", "id")
//       assert AccessTokens.scopes_match?([scope], "updateCluster", "id")
//       assert AccessTokens.scopes_match?([scope], "updateService", "id2")

//    test "it will match if api and id matches" do
//       scope = build(:scope, identifier: "id", api: "updateService")
//       assert AccessTokens.scopes_match?([scope], "updateService", "id")
//       refute AccessTokens.scopes_match?([scope], "updateCluster", "id")
//       refute AccessTokens.scopes_match?([scope], "updateService", "id2")
//     end
//
//     test "it will match if api and id in list" do
//       scope = build(:scope, ids: ["id"], apis: ["updateService"])
//       assert AccessTokens.scopes_match?([scope], "updateService", "id")
//       refute AccessTokens.scopes_match?([scope], "updateCluster", "id")
//       refute AccessTokens.scopes_match?([scope], "updateService", "id2")
//     end

/// defmodule Console.Users.AccessTokens do
//   alias Console.Schema.AccessToken.Scope
//
//   @spec scopes_match?([Scope.t], binary, binary | nil) :: boolean
//   def scopes_match?(scopes, api, id) do
//     Enum.all?(scopes, &matches_api?(&1, api) && matches_id?(&1, id))
//   end
//
//   defp matches_api?(%Scope{api: api}, api2) when is_binary(api), do: api == api2
//   defp matches_api?(%Scope{apis: [_ | _] = apis}, api), do: Enum.member?(apis, api)
//   defp matches_api?(%Scope{api: nil, apis: nil}, _), do: true
//   defp matches_api?(_, _), do: false
//
//   defp matches_id?(_, nil), do: true
//   defp matches_id?(%Scope{identifier: "*"}, _), do: true
//   defp matches_id?(%Scope{ids: ["*"]}, _), do: true
//   defp matches_id?(%Scope{ids: [_ | _] = ids}, id), do: Enum.member?(ids, id)
//   defp matches_id?(%Scope{identifier: id}, id2) when is_binary(id), do: id == id2
//   defp matches_id?(%Scope{identifier: nil, ids: nil}, _), do: true
//   defp matches_id?(_, _), do: false
// end
