import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { StackOutletContextT, getBreadcrumbs } from '../Stack'

export default function StackFiles() {
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
    />
  )
}
