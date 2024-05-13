import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { StackRun } from '../../../../generated/graphql'
import { StackedText } from '../../../utils/table/StackedText'

export default function StackRunRepository(): ReactNode {
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()
  const theme = useTheme()

  return (
    <Card
      padding="large"
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        flexWrap: 'wrap',
      }}
    >
      <StackedText
        first="Repository"
        second={stackRun.repository?.url}
      />
      <StackedText
        first="Ref"
        second={stackRun.git.ref}
      />
      <StackedText
        first="Folder"
        second={stackRun.git.folder}
      />
      {stackRun.git.files && (
        <StackedText
          first="Files"
          second={stackRun.git.files.map((f) => (
            <div>{f}</div>
          ))}
        />
      )}
    </Card>
  )
}
