import { useTheme } from 'styled-components'

export default function Workloads() {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      deployments replicasets pods jobs cronjobs statefulsets daemonsets
      replicationcontrollers
    </div>
  )
}
