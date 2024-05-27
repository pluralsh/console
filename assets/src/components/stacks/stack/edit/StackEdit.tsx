import { Card, Prop, useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useTheme } from 'styled-components'

import { StackOutletContextT, getBreadcrumbs } from '../Stack'
import ConsolePageTitle from '../../../utils/layout/ConsolePageTitle'

export default function StackEdit() {
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
        heading="Edit"
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
        {stack.configuration.image && (
          <Prop title="Image">{stack.configuration.image}</Prop>
        )}
        <Prop title="Version">{stack.configuration.version}</Prop>
        <Prop title="Repository">{stack.repository?.url}</Prop>
        <Prop title="Ref">{stack.git.ref}</Prop>
        <Prop title="Folder">{stack.git.folder}</Prop>
      </Card>
    </>
  )
}
