import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CodeEditor } from '@pluralsh/design-system'

import { StackRun } from '../../../../../generated/graphql'

export default function StackRunPlan(): ReactNode {
  const { stackRun } = useOutletContext<{ stackRun: StackRun }>()
  const value = JSON.parse(stackRun.state?.plan ?? '{}')

  return (
    <CodeEditor
      value={JSON.stringify(value, null, 2)}
      language="json"
      options={{ readOnly: true }}
    />
  )
}
