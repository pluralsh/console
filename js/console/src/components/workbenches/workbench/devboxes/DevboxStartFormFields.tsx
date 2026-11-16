import {
  Checkbox,
  Chip,
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { DevboxAgentType, DevboxProbeStatus } from 'generated/graphql'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'
import {
  autonomyChoices,
  defaultAutonomy,
  isAutonomyOption,
} from './devboxAutonomy'
import {
  agentLabel,
  agentsOf,
  billedToProxy,
  DevboxBilling,
  DevboxStartBox,
  DevboxStartErrors,
  DevboxStartValues,
  dropProxyAuto,
  findAgent,
  MODEL_CATEGORY,
  modelsOf,
  normalizeRepoUrl,
  reconcileStartValues,
  SUBSCRIPTION_PROVIDER,
} from './devboxStartForm'

export type DevboxBillingOptions = {
  // the workbench's allowSubscriptionCredentials policy
  allowed: boolean
  // agents the user has a linked, valid subscription credential for
  linkedAgents: DevboxAgentType[]
  // agents whose linked credential is marked as the default billing
  defaults: Partial<Record<DevboxAgentType, DevboxBilling>>
  settingsPath: string
}

export function DevboxStartFormFields({
  boxes,
  values,
  onChange,
  errors,
  candidateRepositories,
  boxLocked = false,
  billing,
}: {
  boxes: DevboxStartBox[]
  values: DevboxStartValues
  onChange: (values: DevboxStartValues) => void
  errors: DevboxStartErrors
  candidateRepositories: string[]
  boxLocked?: boolean
  billing?: DevboxBillingOptions
}) {
  const box = boxes.find(({ id }) => id === values.devboxId)
  const agents = agentsOf(box)
  const agent = findAgent(box, values.agent)
  const models = modelsOf(agent)
  const agentOptions = (agent?.configOptions ?? []).filter(isNonNullable)
  const autonomyOption = agentOptions.find(isAutonomyOption)
  const proxyBilled =
    !box?.decisionReview &&
    billedToProxy(values, billing?.allowed ? billing.defaults : null)
  const autonomyLevels = autonomyOption
    ? autonomyChoices(autonomyOption, box?.autonomy, proxyBilled)
    : []
  const pickedAutonomy = autonomyOption
    ? values.configOptions[autonomyOption.configId]
    : undefined
  const extraOptions = agentOptions.filter(
    (o) =>
      o.category !== MODEL_CATEGORY && !isAutonomyOption(o) && o.options?.length
  )
  const commands = (agent?.commands ?? []).filter(isNonNullable)
  const [newRepo, setNewRepo] = useState('')

  const repoOptions = [
    ...new Map(
      [...candidateRepositories, ...values.repositories].map((r) => [
        normalizeRepoUrl(r),
        r,
      ])
    ).values(),
  ]
  const selected = new Set(values.repositories.map(normalizeRepoUrl))
  const allowed = (box?.allowedRepositories ?? []).filter(isNonNullable)

  const toggleRepo = (repo: string, on: boolean) =>
    onChange({
      ...values,
      repositories: on
        ? [...values.repositories, repo]
        : values.repositories.filter(
            (r) => normalizeRepoUrl(r) !== normalizeRepoUrl(repo)
          ),
    })

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <FormField
        label="Box"
        required
        error={!!errors.devboxId}
        hint={errors.devboxId}
      >
        <Select
          label="Pick a box"
          isDisabled={boxLocked}
          selectedKey={values.devboxId ?? null}
          onSelectionChange={(key) =>
            onChange(
              reconcileStartValues(
                { ...values, devboxId: `${key}` },
                boxes.find(({ id }) => id === `${key}`)
              )
            )
          }
        >
          {boxes.map((b) => (
            <ListBoxItem
              key={b.id}
              label={b.name}
              description={b.status?.toLowerCase()}
            />
          ))}
        </Select>
      </FormField>
      <Flex gap="medium">
        <FormField
          label="Agent"
          required
          error={!!errors.agent}
          hint={errors.agent}
          css={{ flex: 1 }}
        >
          <Select
            label="Pick an agent"
            selectedKey={values.agent ?? null}
            onSelectionChange={(key) =>
              onChange(
                reconcileStartValues(
                  {
                    ...values,
                    agent: key as DevboxAgentType,
                    model: null,
                    configOptions: {},
                  },
                  box
                )
              )
            }
          >
            {agents.map((a) => (
              <ListBoxItem
                key={a.type}
                label={agentLabel(a.type)}
                description={
                  a.probeStatus === DevboxProbeStatus.Missing
                    ? 'not installed in the image'
                    : a.probeStatus === DevboxProbeStatus.Failed
                      ? 'probe failed, models from the runner spec'
                      : a.default
                        ? 'default'
                        : (a.adapterVersion ?? undefined)
                }
              />
            ))}
          </Select>
        </FormField>
        <FormField
          label="Model"
          required={!!models.length}
          error={!!errors.model}
          hint={
            errors.model ??
            (agent?.modelSwitchable === false
              ? "Fixed for the instance's threads"
              : undefined)
          }
          css={{ flex: 1 }}
        >
          <Select
            label={models.length ? 'Pick a model' : "The agent's default"}
            isDisabled={!models.length}
            selectedKey={values.model ?? null}
            onSelectionChange={(key) =>
              onChange({ ...values, model: `${key}` })
            }
          >
            {models.map((m) => (
              <ListBoxItem
                key={m.id}
                label={m.name}
                description={m.description ?? undefined}
              />
            ))}
          </Select>
        </FormField>
      </Flex>
      {autonomyOption && (
        <FormField
          label="Autonomy"
          hint="How the agent's permission requests are answered"
        >
          <Select
            label="Pick an autonomy level"
            selectedKey={
              (autonomyLevels.some(
                (c) => c.value === pickedAutonomy && !c.unavailable
              )
                ? pickedAutonomy
                : defaultAutonomy(
                    autonomyOption,
                    box?.autonomy,
                    proxyBilled
                  )) ?? null
            }
            onSelectionChange={(key) =>
              onChange({
                ...values,
                configOptions: {
                  ...values.configOptions,
                  [autonomyOption.configId]: `${key}`,
                },
              })
            }
          >
            {autonomyLevels.map((c) => (
              <ListBoxItem
                key={c.value}
                label={c.label}
                disabled={!!c.unavailable}
                description={c.unavailable ?? c.description}
              />
            ))}
          </Select>
        </FormField>
      )}
      {extraOptions.map((option) => (
        <FormField
          key={option.configId}
          label={option.name ?? option.configId}
          hint={option.description ?? undefined}
        >
          <Select
            label={option.currentValue ?? 'Default'}
            selectedKey={
              values.configOptions[option.configId] ??
              option.currentValue ??
              null
            }
            onSelectionChange={(key) =>
              onChange({
                ...values,
                configOptions: {
                  ...values.configOptions,
                  [option.configId]: `${key}`,
                },
              })
            }
          >
            {(option.options ?? []).filter(isNonNullable).map((o) => (
              <ListBoxItem
                key={o.value}
                label={o.name ?? o.value}
                description={o.description ?? undefined}
              />
            ))}
          </Select>
        </FormField>
      ))}
      {billing?.allowed && (
        <DevboxBillingFields
          agents={agents.map((a) => a.type)}
          values={values}
          onChange={(next) =>
            onChange(
              dropProxyAuto(
                next,
                autonomyOption?.configId,
                billing.defaults,
                box?.decisionReview
              )
            )
          }
          billing={billing}
        />
      )}
      <FormField
        label="Repositories"
        hint={
          errors.repositories ??
          (allowed.length
            ? 'Narrowed to the repositories this box allows'
            : 'Cloned to ~/<repo> at boot; agents can clone more later')
        }
        error={!!errors.repositories}
      >
        <Flex
          direction="column"
          gap="xsmall"
        >
          {repoOptions.map((repo) => (
            <Checkbox
              key={repo}
              small
              checked={selected.has(normalizeRepoUrl(repo))}
              onChange={(e) => toggleRepo(repo, e.target.checked)}
            >
              {repo}
            </Checkbox>
          ))}
          <Input
            placeholder="Add a repository URL"
            value={newRepo}
            onChange={(e) => setNewRepo(e.currentTarget.value)}
            onEnter={() => {
              const repo = newRepo.trim()
              if (!repo || selected.has(normalizeRepoUrl(repo))) return
              toggleRepo(repo, true)
              setNewRepo('')
            }}
          />
        </Flex>
      </FormField>
      <FormField
        label="Name"
        hint="Optional"
      >
        <Input
          value={values.name}
          placeholder="e.g. devboxes-ui"
          onChange={(e) => onChange({ ...values, name: e.currentTarget.value })}
        />
      </FormField>
      {!!commands.length && (
        <FormField
          label="Slash commands"
          hint="Captured when the box was built; each thread reports its own once it starts"
        >
          <Flex
            gap="xxsmall"
            wrap="wrap"
          >
            {commands.slice(0, 24).map((c) => (
              <Chip
                key={c.name}
                size="small"
                tooltip={c.description ?? undefined}
              >
                /{c.name}
              </Chip>
            ))}
          </Flex>
        </FormField>
      )}
    </Flex>
  )
}

function DevboxBillingFields({
  agents,
  values,
  onChange,
  billing,
}: {
  agents: DevboxAgentType[]
  values: DevboxStartValues
  onChange: (values: DevboxStartValues) => void
  billing: DevboxBillingOptions
}) {
  const planAgents = agents.filter((a) => SUBSCRIPTION_PROVIDER[a])
  if (!planAgents.length) return null
  return (
    <FormField
      label="Billing"
      hint="Fixed per agent for the instance's lifetime"
    >
      <Flex
        direction="column"
        gap="small"
      >
        {planAgents.map((type) => {
          const linked = billing.linkedAgents.includes(type)
          const plan = SUBSCRIPTION_PROVIDER[type]!.plan
          return (
            <Flex
              key={type}
              gap="small"
              align="center"
            >
              <CaptionP css={{ width: 120 }}>{agentLabel(type)}</CaptionP>
              <Select
                label="Plural AI proxy"
                selectedKey={
                  values.billing[type] ?? billing.defaults[type] ?? 'proxy'
                }
                onSelectionChange={(key) =>
                  onChange({
                    ...values,
                    billing: {
                      ...values.billing,
                      [type]: key as DevboxBilling,
                    },
                  })
                }
              >
                <ListBoxItem
                  key="proxy"
                  label="Plural AI proxy"
                />
                <ListBoxItem
                  key="subscription"
                  label={`My ${plan}`}
                  disabled={!linked}
                  description={linked ? undefined : 'Not linked'}
                />
              </Select>
              {!linked && (
                <Link to={billing.settingsPath}>
                  <CaptionP $color="text-primary-accent">
                    Link your {plan}
                  </CaptionP>
                </Link>
              )}
            </Flex>
          )
        })}
      </Flex>
    </FormField>
  )
}
