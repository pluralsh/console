import { Chip } from '@pluralsh/design-system'

const eventTypeSecerity = {
  warning: 'warning',
}

const namespacePhaseSeverity = {
  active: 'success',
  terminating: 'error',
}

export function EventTypeChip({ type }: { type: string | undefined }) {
  if (!type) return undefined

  const severity = eventTypeSecerity[type.toLowerCase()] ?? 'info'

  return (
    <Chip
      size="small"
      severity={severity}
    >
      {type}
    </Chip>
  )
}

export function NamespacePhaseChip({ phase }: { phase: string | undefined }) {
  if (!phase) return undefined

  const severity = namespacePhaseSeverity[phase.toLowerCase()] ?? 'info'

  return (
    <Chip
      size="small"
      severity={severity}
    >
      {phase}
    </Chip>
  )
}
