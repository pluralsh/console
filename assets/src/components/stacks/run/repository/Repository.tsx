import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, Prop } from '@pluralsh/design-system'

import { StackRun } from '../../../../generated/graphql'

export default function StackRunRepository(): ReactNode {
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()

  return (
    <Card
      padding="large"
      css={{
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <Prop title="Repository">{stackRun.repository?.url}</Prop>
      <Prop title="Ref">{stackRun.git.ref}</Prop>
      <Prop title="Folder">{stackRun.git.folder}</Prop>

      {stackRun.git.files && (
        <Prop title="Files">
          {stackRun.git.files.map((f) => (
            <div>{f}</div>
          ))}
        </Prop>
      )}
    </Card>
  )
}
