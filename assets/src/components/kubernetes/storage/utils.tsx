import { Chip } from '@pluralsh/design-system'

const pvcStatusSeverity = {
  bound: 'success',
  pending: 'info',
  lost: 'error',
}

const pvStatusSeverity = {
  available: 'success',
  bound: 'success',
  pending: 'warning',
  released: 'neutral',
  failed: 'error',
}

export function PVCStatusChip({ status }: { status: string | undefined }) {
  if (!status) return undefined

  const severity = pvcStatusSeverity[status.toLowerCase()] ?? 'info'

  return (
    <Chip
      size="small"
      severity={severity}
    >
      {status}
    </Chip>
  )
}

export function PVStatusChip({ status }: { status: string | undefined }) {
  if (!status) return undefined

  const severity = pvStatusSeverity[status.toLowerCase()] ?? 'info'

  return (
    <Chip
      size="small"
      severity={severity}
    >
      {status}
    </Chip>
  )
}
