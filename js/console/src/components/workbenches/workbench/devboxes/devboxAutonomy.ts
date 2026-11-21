import { DevboxAutonomy, DevboxConfigOptionFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

// the daemon's synthetic config option for a thread's autonomy
export const AUTONOMY_CATEGORY = 'autonomy'

// an agent's own permission modes, which autonomy drives when it's offered
export const MODE_CATEGORY = 'mode'

export const AUTONOMY_LEVELS = [
  {
    value: 'manual',
    label: 'Manual',
    description: 'Ask before every action that needs permission',
  },
  {
    value: 'auto',
    label: 'Auto',
    description:
      "The agent's reviewer approves safe actions and asks you about the rest",
  },
  {
    value: 'full',
    label: 'Full',
    description: 'Approve everything without asking',
  },
] as const

const RANK: Record<string, number> = { manual: 0, auto: 1, full: 2 }

export type DevboxAutonomyPolicy = {
  default?: Nullable<DevboxAutonomy>
  max?: Nullable<DevboxAutonomy>
}

export type AutonomyChoice = {
  value: string
  label: string
  description: string
  // why the level can't be picked, if it can't
  unavailable?: string
}

export const isAutonomyOption = (o: Nullable<DevboxConfigOptionFragment>) =>
  o?.category === AUTONOMY_CATEGORY

// every level, with the ones the agent doesn't offer or the box's max excludes marked unavailable. The agents'
// reviewers can't run through the AI proxy, so on proxy billing auto needs a decision model to review instead.
export function autonomyChoices(
  option: DevboxConfigOptionFragment,
  policy?: Nullable<DevboxAutonomyPolicy>,
  proxyBilled = false
): AutonomyChoice[] {
  const offered = new Set(
    (option.options ?? []).filter(isNonNullable).map((o) => o.value)
  )
  const max = policy?.max?.toLowerCase()
  return AUTONOMY_LEVELS.map((level) => ({
    ...level,
    unavailable:
      max && RANK[level.value] > RANK[max]
        ? `Above this box's max of ${max}`
        : !offered.has(level.value)
          ? level.value === 'auto'
            ? 'This agent or model has no reviewer for auto yet'
            : 'Not available for this agent'
          : proxyBilled && level.value === 'auto'
            ? 'Needs subscription billing, or AI enabled in settings'
            : undefined,
  }))
}

// the box default, lowered to the closest level the agent offers (Pi only runs at full)
export function defaultAutonomy(
  option: DevboxConfigOptionFragment,
  policy?: Nullable<DevboxAutonomyPolicy>,
  proxyBilled = false
): Nullable<string> {
  const available = autonomyChoices(option, policy, proxyBilled).filter(
    (c) => !c.unavailable
  )
  const want = RANK[policy?.default?.toLowerCase() ?? 'auto']
  return (
    [...available].reverse().find((c) => RANK[c.value] <= want)?.value ??
    available[0]?.value ??
    null
  )
}
