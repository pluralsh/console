import { ReactElement } from 'react'
import { useTheme } from 'styled-components'

import { Provider } from '../types'

import { NodeGroupContainer } from './NodeGroupContainer'

export function Azure(): ReactElement {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <NodeGroupContainer provider={Provider.Azure} />
    </div>
  )
}
