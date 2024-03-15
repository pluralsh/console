import { Chip } from '@pluralsh/design-system'

const namespacePhaseSeverity = {
  active: 'success',
  terminating: 'error',
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
