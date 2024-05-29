import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, Prop } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { StackRun } from '../../../../generated/graphql'

export default function StackRunRepository(): ReactNode {
  const theme = useTheme()
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()

  return (
    <Card
      css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gridGap: theme.spacing.large,
        padding: theme.spacing.large,
      }}
    >
      <Prop
        title="Repository"
        margin={0}
      >
        {stackRun.repository?.url}
      </Prop>
      <Prop
        title="Ref"
        margin={0}
      >
        {stackRun.git.ref}
      </Prop>
      <Prop
        title="Folder"
        margin={0}
      >
        {stackRun.git.folder}
      </Prop>
      {stackRun.git.files && (
        <Prop
          title="Files"
          margin={0}
        >
          {stackRun.git.files.map((f) => (
            <div>{f}</div>
          ))}
        </Prop>
      )}
    </Card>
  )
}
