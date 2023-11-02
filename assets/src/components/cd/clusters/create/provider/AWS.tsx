import { ReactElement, useEffect, useMemo } from 'react'
import { Input } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ProviderCloud } from '../types'

import { NodeGroupContainer } from './NodeGroupContainer'

export function AWS({
  onValidityChange,
}: {
  onValidityChange: (valid: boolean) => void
}): ReactElement {
  const theme = useTheme()
  // const {
  //   create: {
  //     attributes: { cloudSettings },
  //     setAwsSettings,
  //   },
  // } = useCreateClusterContext()
  // const settings = cloudSettings?.aws
  // const setSettings = setAwsSettings

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
      <Input
        width="fit-content"
        placeholder="vpc-xyz123"
        prefix={
          <div
            css={{
              marginLeft: theme.spacing.xxsmall,
            }}
          >
            VPC ID*
          </div>
        }
      />
      <NodeGroupContainer provider={ProviderCloud.AWS} />
    </div>
  )
}
