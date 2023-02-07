export const hasAlerts = runbook => runbook?.status?.alerts?.length > 0

export const getBorderColor = runbook => (hasAlerts(runbook) ? 'border-warning' : '')
