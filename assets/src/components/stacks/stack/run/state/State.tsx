import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CodeEditor } from '@pluralsh/design-system'

import { StackRun } from '../../../../../generated/graphql'

export default function StackRunState(): ReactNode {
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()
  const value = JSON.stringify(stackRun.state?.state ?? {}, null, 2)

  return (
    <CodeEditor
      value={value}
      language="json"
      options={{ readOnly: true }}
    />
  )
}
