import {
  Button,
  Callout,
  Card,
  Chip,
  Code,
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Select,
  Switch,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ApolloError } from '@apollo/client'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  Body2BoldP,
  CaptionP,
  Subtitle2H1,
} from 'components/utils/typography/Text'
import {
  AgentCredential,
  AgentCredentialsApi,
  LinkAgentCredentialAttributes,
  PROVIDER_PLAN,
  useAgentCredentials,
} from 'components/workbenches/workbench/devboxes/devboxCredentials'
import dayjs from 'dayjs'
import {
  AgentCredentialKind,
  AgentCredentialProvider,
  AgentCredentialStatus,
} from 'generated/graphql'
import { useState } from 'react'
import { fromNow } from 'utils/datetime'
import { PROFILE_BREADCRUMBS } from '../MyProfile'
import {
  ACCESS_TOKEN_EXPIRY_DAYS,
  credentialWarning,
  validateClaudeToken,
  validateCodexAccessToken,
  validateCodexAuthJson,
} from './aiSubscriptionValidation'

const breadcrumbs = [...PROFILE_BREADCRUMBS, { label: 'ai subscriptions' }]

const PROVIDER_AGENT: Record<AgentCredentialProvider, string> = {
  [AgentCredentialProvider.Claude]: 'Claude Code',
  [AgentCredentialProvider.Codex]: 'Codex',
}

const KIND_LABELS: Record<AgentCredentialKind, string> = {
  [AgentCredentialKind.ClaudeOauthToken]: 'setup token',
  [AgentCredentialKind.CodexChatgptAuth]: 'ChatGPT login',
  [AgentCredentialKind.CodexAccessToken]: 'access token',
}

export function AiSubscriptions() {
  useSetBreadcrumbs(breadcrumbs)
  const api = useAgentCredentials()
  if (api.error) return <GqlError error={api.error} />
  if (api.loading) return <LoadingIndicator />
  return <AiSubscriptionsView api={api} />
}

export function AiSubscriptionsView({ api }: { api: AgentCredentialsApi }) {
  return (
    <Flex
      direction="column"
      gap="large"
    >
      <CaptionP $color="text-light">
        Link your own Claude or ChatGPT plan to run devbox agents on it instead
        of the Plural AI proxy. Credentials are only used for instances you
        start, in workbenches that allow personal subscriptions, and
        subscription traffic skips the AI proxy's audit and budgets.
      </CaptionP>
      <LinkedCredentials api={api} />
      <LinkClaude api={api} />
      <LinkChatGpt api={api} />
    </Flex>
  )
}

function LinkedCredentials({ api }: { api: AgentCredentialsApi }) {
  const { popToast } = useSimpleToast()
  const [removing, setRemoving] = useState<Nullable<AgentCredential>>(null)
  const [removeError, setRemoveError] = useState<Nullable<ApolloError>>(null)
  const [busy, setBusy] = useState<Nullable<string>>(null)
  if (!api.credentials.length) return null
  return (
    <Card css={{ padding: 24 }}>
      <Flex
        direction="column"
        gap="medium"
      >
        <Subtitle2H1>Linked</Subtitle2H1>
        {api.credentials.map((c) => {
          const warning = credentialWarning(c)
          return (
            <Flex
              key={c.id}
              justify="space-between"
              align="center"
              gap="medium"
            >
              <Flex direction="column">
                <Body2BoldP>
                  {c.label ||
                    `${PROVIDER_PLAN[c.provider]}${c.plan ? ` (${c.plan})` : ''}`}
                </Body2BoldP>
                <CaptionP $color="text-xlight">
                  {[
                    `${PROVIDER_AGENT[c.provider]} · ${KIND_LABELS[c.kind]}`,
                    c.email,
                    c.expiresAt &&
                      `expires ${dayjs(c.expiresAt).format('MMM D, YYYY')}`,
                    c.lastUsedAt && `last used ${fromNow(c.lastUsedAt)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </CaptionP>
                {warning && (
                  <CaptionP
                    $color={
                      warning.severity === 'danger'
                        ? 'text-danger'
                        : 'text-warning'
                    }
                  >
                    {warning.message}
                  </CaptionP>
                )}
              </Flex>
              <Flex
                gap="medium"
                align="center"
              >
                <Switch
                  checked={!!c.defaultBilling}
                  disabled={busy === c.id}
                  onChange={(enabled) => {
                    setBusy(c.id)
                    api
                      .setDefaultBilling(c.provider, enabled)
                      .catch((e) =>
                        popToast({
                          content: (e as Error).message,
                          severity: 'danger',
                        })
                      )
                      .then(() => setBusy(null))
                  }}
                >
                  Default for new instances
                </Switch>
                <Chip
                  size="small"
                  severity={
                    c.status === AgentCredentialStatus.Valid
                      ? warning
                        ? 'warning'
                        : 'success'
                      : 'danger'
                  }
                >
                  {c.status.toLowerCase()}
                </Chip>
                <Button
                  small
                  destructive
                  onClick={() => setRemoving(c)}
                >
                  Remove
                </Button>
              </Flex>
            </Flex>
          )
        })}
      </Flex>
      <Confirm
        open={!!removing}
        close={() => {
          setRemoving(null)
          setRemoveError(null)
        }}
        destructive
        label="Remove"
        title="Remove credential"
        error={removeError ?? undefined}
        text={
          removing?.provider === AgentCredentialProvider.Claude
            ? 'Plural stops using this token, but it stays valid at Anthropic until it expires. Treat it like a password.'
            : 'Plural stops using this login. Running instances on it fail auth until you relink or switch them to the AI proxy.'
        }
        submit={() => {
          if (!removing) return
          api
            .remove(removing.id)
            .then(() => setRemoving(null))
            .catch((e) => setRemoveError(e as ApolloError))
        }}
      />
    </Card>
  )
}

function useLink(api: AgentCredentialsApi) {
  const { popToast } = useSimpleToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<Nullable<string>>(null)
  const link = (attrs: LinkAgentCredentialAttributes, onDone: () => void) => {
    setSaving(true)
    setError(null)
    api
      .link(attrs)
      .then(() => {
        popToast({ content: 'Linked and verified', severity: 'success' })
        onDone()
      })
      .catch((e) => setError((e as Error).message))
      .then(() => setSaving(false))
  }
  return { link, saving, error }
}

function LinkClaude({ api }: { api: AgentCredentialsApi }) {
  const [token, setToken] = useState('')
  const [touched, setTouched] = useState(false)
  const { link, saving, error } = useLink(api)
  const invalid = validateClaudeToken(token)
  return (
    <Card css={{ padding: 24 }}>
      <Flex
        direction="column"
        gap="medium"
      >
        <Subtitle2H1>Link Claude</Subtitle2H1>
        <CaptionP $color="text-light">
          Pro, Max, Team or Enterprise. On a machine with a browser, run this,
          approve the sign-in, and copy the token it prints (it isn't saved
          anywhere). It lasts a year and Anthropic can't revoke it. Linking
          again replaces the stored token.
        </CaptionP>
        <Code language="sh">claude setup-token</Code>
        <FormField
          label="Token"
          error={touched && !!invalid}
          hint={touched ? (invalid ?? undefined) : undefined}
        >
          <Input
            type="password"
            autoComplete="off"
            placeholder="sk-ant-oat01-…"
            value={token}
            onChange={(e) => setToken(e.currentTarget.value)}
            onBlur={() => setTouched(true)}
          />
        </FormField>
        {error && <CaptionP $color="text-danger">{error}</CaptionP>}
        <Button
          small
          css={{ alignSelf: 'flex-start' }}
          disabled={!!invalid}
          loading={saving}
          onClick={() =>
            link(
              {
                kind: AgentCredentialKind.ClaudeOauthToken,
                secret: token.trim(),
              },
              () => {
                setToken('')
                setTouched(false)
              }
            )
          }
        >
          Save
        </Button>
      </Flex>
    </Card>
  )
}

function LinkChatGpt({ api }: { api: AgentCredentialsApi }) {
  const [mode, setMode] = useState<'auth_json' | 'access_token'>('auth_json')
  const [authJson, setAuthJson] =
    useState<Nullable<{ name: string; text: string }>>(null)
  const [token, setToken] = useState('')
  const [expiryDays, setExpiryDays] = useState(30)
  const { link, saving, error } = useLink(api)
  const invalid =
    mode === 'auth_json'
      ? authJson
        ? validateCodexAuthJson(authJson.text)
        : 'Upload auth.json'
      : validateCodexAccessToken(token)

  return (
    <Card css={{ padding: 24 }}>
      <Flex
        direction="column"
        gap="medium"
      >
        <Subtitle2H1>Link ChatGPT for Codex</Subtitle2H1>
        <Flex gap="xsmall">
          <Button
            small
            secondary={mode !== 'auth_json'}
            onClick={() => setMode('auth_json')}
          >
            auth.json (Plus, Pro, Business)
          </Button>
          <Button
            small
            secondary={mode !== 'access_token'}
            onClick={() => setMode('access_token')}
          >
            Access token (Enterprise)
          </Button>
        </Flex>
        {mode === 'auth_json' ? (
          <>
            <Callout
              severity="warning"
              title="Use a dedicated login"
            >
              Don't upload the auth.json your laptop uses. Refresh tokens
              rotate, so a shared login signs one side out.
            </Callout>
            <Code language="sh">
              {`export CODEX_HOME="$(mktemp -d)"
printf 'cli_auth_credentials_store = "file"\\n' > "$CODEX_HOME/config.toml"
codex login   # or: codex login --device-auth
# upload $CODEX_HOME/auth.json, then: rm -rf "$CODEX_HOME"`}
            </Code>
            <FormField
              label="auth.json"
              error={!!authJson && !!invalid}
              hint={authJson ? (invalid ?? authJson.name) : undefined}
            >
              <input
                type="file"
                accept="application/json,.json"
                aria-label="auth.json"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0]
                  setAuthJson(
                    file ? { name: file.name, text: await file.text() } : null
                  )
                }}
              />
            </FormField>
          </>
        ) : (
          <>
            <CaptionP $color="text-light">
              Once a workspace admin enables access tokens, create one at
              chatgpt.com/admin/access-tokens and paste it with the expiry you
              chose. Console warns before it expires.
            </CaptionP>
            <Flex gap="medium">
              <FormField
                label="Access token"
                css={{ flex: 1 }}
              >
                <Input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.currentTarget.value)}
                />
              </FormField>
              <FormField label="Expires in">
                <Select
                  selectedKey={`${expiryDays}`}
                  onSelectionChange={(k) => setExpiryDays(Number(k))}
                >
                  {ACCESS_TOKEN_EXPIRY_DAYS.map((d) => (
                    <ListBoxItem
                      key={`${d}`}
                      label={`${d} days`}
                    />
                  ))}
                </Select>
              </FormField>
            </Flex>
          </>
        )}
        {error && <CaptionP $color="text-danger">{error}</CaptionP>}
        <Button
          small
          css={{ alignSelf: 'flex-start' }}
          disabled={!!invalid}
          loading={saving}
          onClick={() =>
            link(
              mode === 'auth_json'
                ? {
                    kind: AgentCredentialKind.CodexChatgptAuth,
                    secret: authJson?.text ?? '',
                  }
                : {
                    kind: AgentCredentialKind.CodexAccessToken,
                    secret: token.trim(),
                    expiresAt: dayjs().add(expiryDays, 'day').toISOString(),
                  },
              () => {
                setAuthJson(null)
                setToken('')
              }
            )
          }
        >
          Save
        </Button>
      </Flex>
    </Card>
  )
}
