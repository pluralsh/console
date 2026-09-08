import type {
  WorkbenchJobBudgetAttributes,
  WorkbenchJobCodingModesAttributes,
  WorkbenchJobKubernetesModesAttributes,
  WorkbenchJobModes,
  WorkbenchJobModesAttributes,
} from 'generated/graphql'

export type WorkbenchPromptMode = 'agent' | 'plan'

export const VERIFICATION_LOOP_LABEL = 'Verification loop'
export const VERIFICATION_LOOP_HINT =
  'Auto-trigger a verification loop after PRs.'
export const TOKEN_LIMIT_LABEL = 'Set token limit'
export const TOKEN_LIMIT_HINT =
  'Set a dollar or token limit. Default is unlimited.'
export const READ_MODE_LABEL = 'Read mode'
export const WRITE_MODE_LABEL = 'Write mode'
export const WRITE_MODE_HINT =
  'Full access. Agents edit code, apply changes and open pull requests to fix what they find.'
export const CODING_AGENT_LABEL = 'Coding agent'
export const KUBERNETES_ACTIONS_LABEL = 'Enable Kubernetes actions'
export const KUBERNETES_ACTIONS_HINT =
  'Reads are always permitted. Every mutation you enable below still requires your approval before it runs. Kubernetes RBAC is enforced end to end for every action.'

export function attributesForPromptMode(
  mode: WorkbenchPromptMode,
  current: WorkbenchJobModesAttributes | null
): WorkbenchJobModesAttributes {
  const shared = {
    budget: current?.budget,
    model: current?.model,
    verification: current?.verification,
  }

  switch (mode) {
    case 'plan':
      return { ...shared, plan: true }
    case 'agent':
      return {
        ...shared,
        plan: false,
        coding: current?.coding ?? {},
        kubernetes: current?.kubernetes,
      }
  }
}

export function modesAttributes(
  modes: WorkbenchJobModesAttributes | null | undefined
): WorkbenchJobModesAttributes | undefined {
  if (!modes) return

  const budget = budgetAttributes(modes.budget)
  const attributes = {
    budget,
    model: modes.model,
    plan: modes.plan,
    verification: modes.verification,
    coding: modes.coding,
    kubernetes: modes.kubernetes,
  }

  if (
    budget != null ||
    modes.model != null ||
    modes.plan != null ||
    modes.verification != null ||
    modes.coding != null ||
    modes.kubernetes != null
  )
    return attributes
}

export function modesFormValue(
  modes: WorkbenchJobModes | null | undefined
): WorkbenchJobModesAttributes | null {
  if (!modes) return null

  return {
    plan: modes.plan,
    verification: modes.verification,
    model:
      modes.model?.provider && modes.model.model
        ? {
            provider: modes.model.provider,
            model: modes.model.model,
          }
        : undefined,
    coding: modes.coding
      ? {
          approval: modes.coding.approval,
          babysit: modes.coding.babysit,
          review: modes.coding.review,
        }
      : undefined,
    budget: modes.budget
      ? {
          cost: modes.budget.cost,
          tokens: modes.budget.tokens,
        }
      : undefined,
    kubernetes: modes.kubernetes
      ? {
          update: modes.kubernetes.update,
          delete: modes.kubernetes.delete,
          exec: modes.kubernetes.exec,
          drain: modes.kubernetes.drain,
          requireNamespaces:
            modes.kubernetes.requireNamespaces?.filter(
              (namespace): namespace is string => !!namespace
            ) ?? [],
          excludeNamespaces:
            modes.kubernetes.excludeNamespaces?.filter(
              (namespace): namespace is string => !!namespace
            ) ?? [],
        }
      : undefined,
  }
}

function budgetAttributes(
  budget: WorkbenchJobBudgetAttributes | null | undefined
): WorkbenchJobBudgetAttributes | undefined {
  if (!budget) return

  const cost = budget.cost != null && budget.cost > 0 ? budget.cost : undefined
  const tokens =
    budget.tokens != null && budget.tokens > 0 ? budget.tokens : undefined

  if (cost == null && tokens == null) return

  // Only one budget unit is active; explicitly clear the other on save.
  if (cost != null) return { cost, tokens: null }
  return { tokens, cost: null }
}

export function updateCodingModes(
  modes: WorkbenchJobModesAttributes | null,
  coding: WorkbenchJobCodingModesAttributes
): WorkbenchJobModesAttributes {
  return {
    ...modes,
    plan: false,
    coding: { ...modes?.coding, ...coding },
  }
}

/** Clear mutation permissions but keep namespace restrictions. */
export function disableKubernetesModes(
  current: WorkbenchJobKubernetesModesAttributes | null | undefined
): WorkbenchJobKubernetesModesAttributes | undefined {
  if (!current) return undefined

  return {
    ...current,
    update: false,
    delete: false,
    exec: false,
    drain: false,
  }
}

/** Enable Kubernetes actions, preserving namespace restrictions. */
export function enableKubernetesModes(
  current: WorkbenchJobKubernetesModesAttributes | null | undefined
): WorkbenchJobKubernetesModesAttributes {
  const wasEnabled =
    !!current?.update ||
    !!current?.delete ||
    !!current?.exec ||
    !!current?.drain

  return {
    ...current,
    update: wasEnabled ? !!current?.update : true,
    delete: wasEnabled ? !!current?.delete : false,
    exec: wasEnabled ? !!current?.exec : false,
    drain: wasEnabled ? !!current?.drain : false,
  }
}

export function updateBudgetModes(
  modes: WorkbenchJobModesAttributes | null,
  budget: WorkbenchJobBudgetAttributes | undefined
): WorkbenchJobModesAttributes | null {
  const next = { ...modes, budget }

  if (
    !budget &&
    !next.plan &&
    !next.verification &&
    next.coding == null &&
    next.model == null &&
    next.kubernetes == null
  )
    return null

  return next
}

export function defaultPromptModesFromWorkbench(
  workbench:
    | {
        id: string
        configuration?: {
          coding?: { enableBabysitting?: boolean | null } | null
        } | null
        modes?: WorkbenchJobModes | null
      }
    | null
    | undefined,
  workbenchId: string | null
): WorkbenchJobModesAttributes | null | undefined {
  if (!workbenchId || !workbench || workbench.id !== workbenchId)
    return undefined

  return (
    modesAttributes(modesFormValue(workbench.modes)) ??
    (workbench.configuration?.coding?.enableBabysitting
      ? { coding: { babysit: true } }
      : null)
  )
}
