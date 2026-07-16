import type {
  WorkbenchJobBudgetAttributes,
  WorkbenchJobCodingModesAttributes,
  WorkbenchJobModesAttributes,
} from 'generated/graphql'

export type WorkbenchPromptMode = 'agent' | 'plan'

export function attributesForPromptMode(
  mode: WorkbenchPromptMode,
  current: WorkbenchJobModesAttributes | null
): WorkbenchJobModesAttributes {
  switch (mode) {
    case 'plan':
      return { budget: current?.budget, model: current?.model, plan: true }
    case 'agent':
      return {
        budget: current?.budget,
        model: current?.model,
        coding: current?.coding ?? {},
      }
  }
}

export function modesAttributes(
  modes: WorkbenchJobModesAttributes | null | undefined
): WorkbenchJobModesAttributes | undefined {
  if (!modes) return

  const budget = budgetAttributes(modes.budget)
  const shared = { budget, model: modes.model }

  if (modes.plan) return { ...shared, plan: true }
  if (modes.coding != null) return { ...shared, coding: modes.coding }
  if (budget != null || modes.model != null) return shared
}

function budgetAttributes(
  budget: WorkbenchJobBudgetAttributes | null | undefined
): WorkbenchJobBudgetAttributes | undefined {
  if (!budget) return

  const cost = budget.cost != null && budget.cost > 0 ? budget.cost : undefined
  const tokens =
    budget.tokens != null && budget.tokens > 0 ? budget.tokens : undefined

  if (cost == null && tokens == null) return

  return { cost, tokens }
}

export function updateCodingModes(
  modes: WorkbenchJobModesAttributes | null,
  coding: WorkbenchJobCodingModesAttributes
): WorkbenchJobModesAttributes {
  return { ...modes, coding: { ...modes?.coding, ...coding } }
}

export function defaultPromptModesFromWorkbench(
  workbench:
    | {
        id: string
        configuration?: {
          coding?: { enableBabysitting?: boolean | null } | null
        } | null
      }
    | null
    | undefined,
  workbenchId: string | null
): WorkbenchJobModesAttributes | null | undefined {
  if (!workbenchId || !workbench || workbench.id !== workbenchId)
    return undefined

  return workbench.configuration?.coding?.enableBabysitting
    ? { coding: { babysit: true } }
    : null
}
