import { ReactElement, useEffect, useMemo } from 'react'
import { useTheme } from 'styled-components'

import { ProviderCloud } from '../types'

import { NodeGroupContainer } from './NodeGroupContainer'

export function Azure({
  onValidityChange,
}: {
  onValidityChange: (valid: boolean) => void
}): ReactElement {
  const theme = useTheme()
  // const {
  //   create: {
  //     attributes: { cloudSettings },
  //     setAzureSettings,
  //   },
  // } = useCreateClusterContext()
  // const settings = cloudSettings?.azure
  // const setSettings = setAzureSettings

  const valid = useMemo(() => false, [])

  useEffect(() => onValidityChange?.(valid), [onValidityChange, valid])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <NodeGroupContainer provider={ProviderCloud.Azure} />
    </div>
  )
}
