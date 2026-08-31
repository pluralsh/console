import { Chip } from '@pluralsh/design-system'

const crdEstablishedConditionSeverity = {
  true: 'success',
  false: 'error',
  unknown: 'warning',
}

export function CRDEstablishedChip({
  established,
}: {
  established: string | undefined
}) {
  if (!established) return undefined

  const severity =
    crdEstablishedConditionSeverity[established.toLowerCase()] ?? 'info'

  return (
    <Chip
      size="small"
      severity={severity}
    >
      {established}
    </Chip>
  )
}
