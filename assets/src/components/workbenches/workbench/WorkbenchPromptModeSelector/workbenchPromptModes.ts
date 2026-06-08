import type {
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
      return { plan: true }
    case 'agent':
      return { coding: current?.coding ?? {} }
  }
}

export function modesAttributes(
  modes: WorkbenchJobModesAttributes | null | undefined
): WorkbenchJobModesAttributes | undefined {
  if (modes?.plan) return { plan: true }
  if (modes?.coding != null) return { coding: modes.coding }
}

export function updateCodingModes(
  modes: WorkbenchJobModesAttributes | null,
  coding: WorkbenchJobCodingModesAttributes
): WorkbenchJobModesAttributes {
  return { ...modes, coding: { ...modes?.coding, ...coding } }
}
