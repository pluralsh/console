import { ReactElement } from 'react'
import { Input } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { Provider } from '../types'

import { NodeGroupContainer } from './NodeGroupContainer'

export function AWS(): ReactElement {
  const theme = useTheme()

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
      <NodeGroupContainer provider={Provider.AWS} />
    </div>
  )
}
