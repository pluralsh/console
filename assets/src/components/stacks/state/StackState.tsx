import { useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { useStackStateQuery } from '../../../generated/graphql'

import { StackOutletContextT, getBreadcrumbs } from '../Stacks'

export default function StackState() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT

  const { data } = useStackStateQuery({
    variables: { id: stack.id ?? '' },
    fetchPolicy: 'no-cache',
    skip: !stack.id,
  })

  const state = data?.infrastructureStack?.state

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id ?? ''), { label: 'state' }],
      [stack.id]
    )
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        rowGap: theme.spacing.medium,
        height: '100%',
      }}
    >
      {JSON.stringify(state)}
    </div>
  )
}
