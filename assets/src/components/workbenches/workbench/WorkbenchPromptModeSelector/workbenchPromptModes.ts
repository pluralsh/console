import type {
  WorkbenchJobBudgetAttributes,
  WorkbenchJobCodingModesAttributes,
  WorkbenchJobModes,
  WorkbenchJobModesAttributes,
} from 'generated/graphql'

export type WorkbenchPromptMode = 'agent' | 'plan'

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
    modesFormValue(workbench.modes) ??
    (workbench.configuration?.coding?.enableBabysitting
      ? { coding: { babysit: true } }
      : null)
  )
}
