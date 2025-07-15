import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'

import { getBreadcrumbs, StackOutletContextT } from '../Stacks'
import StackConfiguration from './StackConfiguration'

import StackMetadata from './StackMetadata'
import StackRepository from './StackRepository'
import StackTags from './StackTags.tsx'

export default function StackOverview() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'overview' }],
      [stack]
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
        <StackTags />
      </div>
    </ScrollablePage>
  )
}
