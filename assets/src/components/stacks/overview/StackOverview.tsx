import { useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { StackOutletContextT, getBreadcrumbs } from '../Stacks'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'

import StackMetadata from './StackMetadata'
import StackConfiguration from './StackConfiguration'
import StackRepository from './StackRepository'

export default function StackOverview() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.name ?? ''), { label: 'overview' }],
      [stack.name]
    )
  )

  return (
    <ScrollablePage noPadding>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <StackMetadata />
        <StackConfiguration />
        <StackRepository />
      </div>
    </ScrollablePage>
  )
}
