import { Card, Prop, useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { StackOutletContextT, getBreadcrumbs } from '../StackDetails'

export default function StackRepository() {
  const { stackId = '' } = useParams()
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stackId), { label: 'repository' }],
      [stackId]
    )
  )

  if (!stack) {
    return <LoadingIndicator />
  }

  return (
    <Card
      padding="large"
      css={{
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <Prop title="Repository">{stack.repository?.url}</Prop>
      <Prop title="Ref">{stack.git.ref}</Prop>
      <Prop title="Folder">{stack.git.folder}</Prop>
    </Card>
  )
}
