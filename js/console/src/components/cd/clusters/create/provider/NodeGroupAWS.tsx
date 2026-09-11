import { ReactElement } from 'react'
import { Input2, Switch } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

function NodeGroupAWS(): ReactElement<any> {
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
      <Input2 placeholder="Test" />
      <Input2 placeholder="Test" />
      <Input2 placeholder="Test" />
    </div>
  )
}

export { NodeGroupAWS }
