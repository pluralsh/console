import { ReactElement } from 'react'
import { Input, Switch } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

function NodeGroupAWS(): ReactElement {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      <Switch
        aria-label="Spot Instance"
        css={{
          width: 'fit-content',
        }}
      >
        Spot Instance
      </Switch>
      <Input placeholder="Test" />
      <Input placeholder="Test" />
      <Input placeholder="Test" />
    </div>
  )
}

export { NodeGroupAWS }
