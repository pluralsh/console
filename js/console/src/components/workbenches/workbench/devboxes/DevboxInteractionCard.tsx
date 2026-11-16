import {
  Button,
  Checkbox,
  Chip,
  Flex,
  FormField,
  Input,
  LinkoutIcon,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  DevboxElicitationAction,
  DevboxInteractionFragment,
  DevboxInteractionKind,
  DevboxInteractionResponseAttributes,
  DevboxInteractionState,
} from 'generated/graphql'
import { FormEvent, ReactNode, useState } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

export type DevboxRespond = (
  response: DevboxInteractionResponseAttributes
) => void

export function DevboxInteractionCard({
  interaction,
  onRespond,
  loading = false,
  error,
}: {
  interaction: DevboxInteractionFragment
  onRespond: DevboxRespond
  loading?: boolean
  error?: ReactNode
}) {
  const pending = interaction.state === DevboxInteractionState.Pending
  return (
    <InteractionSC
      $pending={pending}
      data-interaction={interaction.kind}
    >
      <Flex
        justify="space-between"
        align="center"
        gap="small"
      >
        <Body2BoldP>
          {interaction.title || defaultTitle(interaction.kind)}
        </Body2BoldP>
        {!pending && (
          <Chip
            size="small"
            severity={
              interaction.state === DevboxInteractionState.Answered
                ? 'success'
                : 'neutral'
            }
          >
            {interaction.state?.toLowerCase()}
            {interaction.answeredBy?.name
              ? ` by ${interaction.answeredBy.name}`
              : interaction.answeredByPolicy?.startsWith('autonomy:')
                ? ` by ${interaction.answeredByPolicy.slice('autonomy:'.length)} autonomy`
                : ''}
          </Chip>
        )}
      </Flex>
      {interaction.message && (
        <CaptionP $color="text-light">{interaction.message}</CaptionP>
      )}
      {interaction.review && (
        <CaptionP $color="text-xlight">
          {reviewSummary(interaction.review)}
        </CaptionP>
      )}
      {pending &&
        (interaction.kind === DevboxInteractionKind.Permission ? (
          <PermissionForm
            interaction={interaction}
            onRespond={onRespond}
            loading={loading}
          />
        ) : interaction.kind === DevboxInteractionKind.FormElicitation ? (
          <ElicitationForm
            schema={interaction.requestedSchema}
            onRespond={onRespond}
            loading={loading}
          />
        ) : interaction.kind === DevboxInteractionKind.UrlElicitation ? (
          <UrlElicitation
            url={interaction.url}
            onRespond={onRespond}
            loading={loading}
          />
        ) : (
          <ElicitationActions
            onRespond={onRespond}
            loading={loading}
          />
        ))}
      {pending && interaction.expiresAt && (
        <CaptionP $color="text-xlight">
          Expires {fromNow(interaction.expiresAt)}
        </CaptionP>
      )}
      {error}
    </InteractionSC>
  )
}

// the devbox reviewer's verdict at autonomy auto, and why it still asked a human if it did
export function reviewSummary(
  review: NonNullable<DevboxInteractionFragment['review']>
): string {
  const details = [
    review.verdict &&
      (review.confidence != null
        ? `${review.verdict} at ${Math.round(review.confidence * 100)}%`
        : review.verdict),
    review.risk && review.risk !== 'none'
      ? `risk: ${review.risk.replaceAll('_', ' ')}`
      : null,
  ].filter(Boolean)
  const suffix = details.length ? ` (${details.join(', ')})` : ''
  return review.escalation
    ? `Asked you because ${review.escalation}${suffix}`
    : `Approved by the reviewer${suffix}`
}

const defaultTitle = (kind: Nullable<DevboxInteractionKind>) =>
  kind === DevboxInteractionKind.Permission
    ? 'Permission requested'
    : 'The agent needs input'

function PermissionForm({
  interaction,
  onRespond,
  loading,
}: {
  interaction: DevboxInteractionFragment
  onRespond: DevboxRespond
  loading: boolean
}) {
  const options = (interaction.options ?? []).filter(isNonNullable)
  return (
    <Flex
      gap="small"
      wrap="wrap"
    >
      {options.map((option) => {
        const reject = `${option.kind ?? ''}`.startsWith('reject')
        return (
          <Button
            key={option.optionId}
            small
            secondary={reject || `${option.kind}`.endsWith('always')}
            destructive={reject && `${option.kind}`.endsWith('always')}
            disabled={loading}
            onClick={() => onRespond({ optionId: option.optionId })}
          >
            {option.name || option.optionId}
          </Button>
        )
      })}
      <Button
        small
        tertiary
        disabled={loading}
        onClick={() => onRespond({ cancelled: true })}
      >
        Cancel
      </Button>
    </Flex>
  )
}

type SchemaProperty = {
  type?: string
  title?: string
  description?: string
  enum?: string[]
  enumNames?: string[]
  oneOf?: { const: string; title?: string }[]
  format?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  default?: unknown
}

type ElicitationSchema = {
  properties?: Record<string, SchemaProperty>
  required?: string[]
}

type FormValue = string | boolean
type FormValues = Record<string, FormValue>

export function parseElicitationSchema(raw: unknown): {
  fields: [string, SchemaProperty][]
  required: Set<string>
} {
  const schema = (
    raw && typeof raw === 'object' ? raw : {}
  ) as ElicitationSchema
  return {
    fields: Object.entries(schema.properties ?? {}),
    required: new Set(schema.required ?? []),
  }
}

export function validateElicitation(
  raw: unknown,
  values: FormValues
): Record<string, string> {
  const { fields, required } = parseElicitationSchema(raw)
  const errors: Record<string, string> = {}
  for (const [key, prop] of fields) {
    const value = values[key]
    const empty = value === undefined || value === ''
    if (empty) {
      if (required.has(key) && prop.type !== 'boolean') errors[key] = 'Required'
      continue
    }
    if (prop.type === 'number' || prop.type === 'integer') {
      const n = Number(value)
      if (!Number.isFinite(n)) errors[key] = 'Enter a number'
      else if (prop.type === 'integer' && !Number.isInteger(n))
        errors[key] = 'Enter a whole number'
      else if (prop.minimum != null && n < prop.minimum)
        errors[key] = `At least ${prop.minimum}`
      else if (prop.maximum != null && n > prop.maximum)
        errors[key] = `At most ${prop.maximum}`
    } else if (prop.type === 'string' && typeof value === 'string') {
      if (prop.minLength != null && value.length < prop.minLength)
        errors[key] = `At least ${prop.minLength} characters`
      else if (prop.maxLength != null && value.length > prop.maxLength)
        errors[key] = `At most ${prop.maxLength} characters`
      else if (prop.format === 'email' && !/^\S+@\S+\.\S+$/.test(value))
        errors[key] = 'Enter an email address'
      else if (prop.format === 'uri' && !/^[a-z][a-z0-9+.-]*:\S+$/i.test(value))
        errors[key] = 'Enter a URL'
    }
  }
  return errors
}

export function elicitationContent(raw: unknown, values: FormValues) {
  const { fields } = parseElicitationSchema(raw)
  const content: Record<string, unknown> = {}
  for (const [key, prop] of fields) {
    const value = values[key]
    if (value === undefined || value === '') continue
    content[key] =
      prop.type === 'number' || prop.type === 'integer' ? Number(value) : value
  }
  return content
}

function initialValues(raw: unknown): FormValues {
  const values: FormValues = {}
  for (const [key, prop] of parseElicitationSchema(raw).fields) {
    if (prop.default !== undefined)
      values[key] =
        typeof prop.default === 'boolean' ? prop.default : `${prop.default}`
    else if (prop.type === 'boolean') values[key] = false
  }
  return values
}

function ElicitationForm({
  schema,
  onRespond,
  loading,
}: {
  schema: unknown
  onRespond: DevboxRespond
  loading: boolean
}) {
  const { fields, required } = parseElicitationSchema(schema)
  const [values, setValues] = useState<FormValues>(() => initialValues(schema))
  const [touched, setTouched] = useState(false)
  const errors = validateElicitation(schema, values)
  const invalid = Object.keys(errors).length > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    onRespond({
      action: DevboxElicitationAction.Accept,
      content: elicitationContent(schema, values),
    })
  }

  return (
    <form onSubmit={submit}>
      <Flex
        direction="column"
        gap="medium"
      >
        {fields.map(([key, prop]) => {
          const set = (v: FormValue) => setValues((s) => ({ ...s, [key]: v }))
          const label = prop.title || key
          const err = touched ? errors[key] : undefined
          const choices = prop.enum
            ? prop.enum.map((v, i) => ({
                value: v,
                label: prop.enumNames?.[i] ?? v,
              }))
            : prop.oneOf?.map((o) => ({
                value: o.const,
                label: o.title ?? o.const,
              }))
          if (prop.type === 'boolean')
            return (
              <Checkbox
                key={key}
                small
                checked={!!values[key]}
                onChange={(e) => set(e.target.checked)}
              >
                {label}
              </Checkbox>
            )
          return (
            <FormField
              key={key}
              label={label}
              required={required.has(key)}
              hint={err ?? prop.description}
              error={!!err}
            >
              {choices ? (
                <Select
                  label={`Pick ${label.toLowerCase()}`}
                  selectedKey={(values[key] as string) ?? null}
                  onSelectionChange={(k) => set(`${k}`)}
                >
                  {choices.map((c) => (
                    <ListBoxItem
                      key={c.value}
                      label={c.label}
                    />
                  ))}
                </Select>
              ) : (
                <Input
                  inputProps={{ 'aria-label': label }}
                  type={
                    prop.type === 'number' || prop.type === 'integer'
                      ? 'number'
                      : prop.format === 'email'
                        ? 'email'
                        : 'text'
                  }
                  value={(values[key] as string) ?? ''}
                  onChange={(e) => set(e.currentTarget.value)}
                />
              )}
            </FormField>
          )
        })}
        <Flex gap="small">
          <Button
            small
            type="submit"
            loading={loading}
            disabled={touched && invalid}
          >
            Submit
          </Button>
          <ElicitationActions
            onRespond={onRespond}
            loading={loading}
          />
        </Flex>
      </Flex>
    </form>
  )
}

function UrlElicitation({
  url,
  onRespond,
  loading,
}: {
  url: Nullable<string>
  onRespond: DevboxRespond
  loading: boolean
}) {
  const safe = !!url && /^https?:\/\//i.test(url)
  return (
    <Flex
      direction="column"
      gap="small"
    >
      {url && <UrlSC>{url}</UrlSC>}
      <Flex gap="small">
        <Button
          small
          as="a"
          href={safe ? url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          disabled={!safe}
          endIcon={<LinkoutIcon />}
        >
          Open link
        </Button>
        <Button
          small
          secondary
          disabled={loading}
          onClick={() => onRespond({ action: DevboxElicitationAction.Accept })}
        >
          I'm done
        </Button>
        <ElicitationActions
          onRespond={onRespond}
          loading={loading}
        />
      </Flex>
    </Flex>
  )
}

function ElicitationActions({
  onRespond,
  loading,
}: {
  onRespond: DevboxRespond
  loading: boolean
}) {
  return (
    <>
      <Button
        small
        secondary
        type="button"
        disabled={loading}
        onClick={() => onRespond({ action: DevboxElicitationAction.Decline })}
      >
        Decline
      </Button>
      <Button
        small
        tertiary
        type="button"
        disabled={loading}
        onClick={() => onRespond({ action: DevboxElicitationAction.Cancel })}
      >
        Cancel
      </Button>
    </>
  )
}

const InteractionSC = styled.div<{ $pending: boolean }>(
  ({ theme, $pending }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
    padding: theme.spacing.medium,
    borderRadius: theme.borderRadiuses.large,
    border: `1px solid ${
      $pending ? theme.colors['border-warning'] : theme.colors.border
    }`,
    backgroundColor: theme.colors['fill-one'],
  })
)

const UrlSC = styled.code(({ theme }) => ({
  ...theme.partials.text.code,
  wordBreak: 'break-all',
  color: theme.colors['text-light'],
}))
