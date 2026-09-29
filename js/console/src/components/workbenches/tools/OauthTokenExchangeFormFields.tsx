import {
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Select,
  Switch,
} from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import {
  OauthTokenExchangeAttributes,
  OauthTokenExchangeType,
} from 'generated/graphql'
import { useState } from 'react'

export function oauthTokenExchangeIsComplete(
  oauth: Nullable<OauthTokenExchangeAttributes>,
  persistedType?: Nullable<OauthTokenExchangeType>
): boolean {
  if (!oauth?.enabled) return true

  const type = oauth.type ?? OauthTokenExchangeType.ClientSecret
  const hasCredential =
    type === OauthTokenExchangeType.ClientAssertion
      ? !!oauth.privateKey?.trim() || persistedType === type
      : !!oauth.clientSecret?.trim() || persistedType === type

  return !!oauth.tokenUrl?.trim() && !!oauth.clientId?.trim() && hasCredential
}

export function OauthTokenExchangeFormFields({
  oauth,
  setOauth,
  persistedType,
}: {
  oauth?: Nullable<OauthTokenExchangeAttributes>
  setOauth: (oauth: OauthTokenExchangeAttributes | undefined) => void
  persistedType?: Nullable<OauthTokenExchangeType>
}) {
  const enabled = !!oauth?.enabled
  const type = oauth?.type ?? OauthTokenExchangeType.ClientSecret
  const [scopes, setScopes] = useState(
    (oauth?.scopes ?? []).filter((scope): scope is string => !!scope).join(' ')
  )
  const update = (next: Partial<OauthTokenExchangeAttributes>) =>
    setOauth({ ...oauth, enabled: true, type, ...next })

  return (
    <>
      <FormField
        label="OAuth token exchange"
        hint="Obtain an access token from an OAuth 2.0 token endpoint before making requests."
      >
        <Switch
          size="small"
          checked={enabled}
          onChange={(checked) => {
            if (checked) {
              setOauth({
                ...oauth,
                enabled: true,
                type,
              })
            } else if (persistedType) {
              setOauth({
                ...oauth,
                enabled: false,
                type,
              })
            } else {
              setOauth(undefined)
            }
          }}
        >
          Enable OAuth client credentials
        </Switch>
      </FormField>
      {enabled && (
        <Flex
          direction="column"
          gap="medium"
        >
          <FormField
            required
            label="Client authentication method"
            hint="Choose a client secret or an RS256-signed JWT client assertion."
          >
            <Select
              label="Client authentication method"
              selectionMode="single"
              selectedKey={type}
              onSelectionChange={(key) =>
                update({ type: key as OauthTokenExchangeType })
              }
            >
              <ListBoxItem
                key={OauthTokenExchangeType.ClientSecret}
                label="Client secret"
              />
              <ListBoxItem
                key={OauthTokenExchangeType.ClientAssertion}
                label="Signed JWT client assertion"
              />
            </Select>
          </FormField>
          <FormField
            required
            label="Token endpoint URL"
            hint="The OAuth 2.0 endpoint used to obtain access tokens."
          >
            <Input
              placeholder="https://identity.example.com/oauth2/token"
              value={oauth.tokenUrl ?? ''}
              onChange={(e) => update({ tokenUrl: e.target.value })}
            />
          </FormField>
          <FormField
            required
            label="Client ID"
            hint="The OAuth 2.0 client identifier registered with the identity provider."
          >
            <Input
              placeholder="OAuth client ID"
              value={oauth.clientId ?? ''}
              onChange={(e) => update({ clientId: e.target.value })}
            />
          </FormField>
          {type === OauthTokenExchangeType.ClientSecret ? (
            <FormField
              required
              label="Client secret"
              hint={
                persistedType === type
                  ? 'Leave blank to keep the stored client secret, or enter a new value to rotate it.'
                  : 'The OAuth 2.0 client secret used to authenticate at the token endpoint.'
              }
            >
              <InputRevealer
                placeholder={
                  persistedType === type
                    ? 'Stored secret'
                    : 'OAuth client secret'
                }
                value={oauth.clientSecret ?? ''}
                onChange={(e) => update({ clientSecret: e.target.value })}
              />
            </FormField>
          ) : (
            <>
              <FormField
                required
                label="RSA private key"
                hint={
                  persistedType === type
                    ? 'PEM-encoded RSA private key used to sign client assertions. Leave blank to keep the stored key.'
                    : 'PEM-encoded RSA private key used to sign RS256 client assertions.'
                }
              >
                <Input
                  multiline
                  minRows={6}
                  maxRows={12}
                  placeholder="-----BEGIN PRIVATE KEY-----"
                  value={oauth.privateKey ?? ''}
                  onChange={(e) => update({ privateKey: e.target.value })}
                />
              </FormField>
              <FormField
                label="Key ID"
                hint="Optional key identifier added to the signed JWT header as both kid and x5t. For x5t-based IdPs (e.g. ADFS), use the base64url-encoded SHA-1 thumbprint of the certificate."
              >
                <Input
                  placeholder="Signing key ID"
                  value={oauth.keyId ?? ''}
                  onChange={(e) => update({ keyId: e.target.value })}
                />
              </FormField>
              <FormField
                label="Audience"
                hint="Overrides the JWT aud claim. Defaults to the token endpoint URL."
              >
                <Input
                  placeholder={oauth.tokenUrl || 'Token endpoint URL'}
                  value={oauth.audience ?? ''}
                  onChange={(e) => update({ audience: e.target.value })}
                />
              </FormField>
            </>
          )}
          <FormField
            label="Resource"
            hint="Optional OAuth resource parameter requested from the token endpoint."
          >
            <Input
              placeholder="Resource identifier"
              value={oauth.resource ?? ''}
              onChange={(e) => update({ resource: e.target.value })}
            />
          </FormField>
          <FormField
            label="Scopes"
            hint="Optional scopes sent to the token endpoint as a space-separated OAuth scope parameter."
          >
            <Input
              placeholder="read write"
              value={scopes}
              onChange={(e) => {
                const value = e.target.value
                setScopes(value)
                update({
                  scopes: value.split(/\s+/).filter(Boolean),
                })
              }}
            />
          </FormField>
        </Flex>
      )}
    </>
  )
}
