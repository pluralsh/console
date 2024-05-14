import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import { StackFragment } from '../../generated/graphql'

import { getBreadcrumbs } from './Stacks'

export default function StackEnvironment() {
  const { stackId = '' } = useParams()
  const { stack } = useOutletContext() as { stack?: Nullable<StackFragment> }

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stackId), { label: 'environment' }],
      [stackId]
    )
  )

  return (
    <Card
      padding="large"
      width="100%"
    >
      {/* TODO */}
      {JSON.stringify(stack?.environment)}
    </Card>
  )
}
