import { useTheme } from 'styled-components'

import { useClusterContext } from './Cluster'

export default function ClusterPRs() {
  const theme = useTheme()
  const { cluster, refetch } = useClusterContext()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xlarge,
      }}
    >
      prs
    </div>
  )
}
