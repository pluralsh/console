import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useTheme } from 'styled-components'

import { StackOutletContextT, getBreadcrumbs } from '../Stack'
import ConsolePageTitle from '../../../utils/layout/ConsolePageTitle'

export default function StackFiles() {
  const theme = useTheme()
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
    <>
      <ConsolePageTitle
        heading="Files"
        headingProps={{
          paddingTop: theme.spacing.small,
          paddingBottom: theme.spacing.medium,
        }}
      />
      <Card
        padding="large"
        css={{
          display: 'flex',
          flexWrap: 'wrap',
        }}
      >
        ...
      </Card>
    </>
  )
}
