const namespacePhaseSeverity = {
  active: 'success',
  terminating: 'error',
}

export const getNamespacePhaseSeverity = (phase: string | undefined) => {
  if (!phase) return 'info'

  return namespacePhaseSeverity[phase.toLowerCase()] ?? 'info'
}
