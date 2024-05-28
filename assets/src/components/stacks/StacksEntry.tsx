import { AppIcon } from '@pluralsh/design-system'
import React from 'react'
import { useTheme } from 'styled-components'

import { useNavigate } from 'react-router-dom'

import { TRUNCATE, TRUNCATE_LEFT } from '../utils/truncate'
import { StackFragment } from '../../generated/graphql'

import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'

import { StackTypeIcon } from './common/StackTypeIcon'
import StackStatusChip from './common/StackStatusChip'

export default function StackEntry({
  stack,
  active,
}: {
  stack: StackFragment
  active: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  return (
    <div
      onClick={() => {
        if (!active) navigate(getStacksAbsPath(stack.id))
      }}
      css={{
        padding: theme.spacing.medium,

        ...(active
          ? {
              backgroundColor: theme.colors['fill-zero-selected'],
              borderBottom: `2px solid ${theme.colors['border-primary']}`,
              cursor: 'default',
            }
          : {
              borderBottom: theme.borders.default,
              cursor: 'pointer',

              '&:hover': {
                backgroundColor: theme.colors['fill-zero-hover'],
              },
            }),
      }}
    >
      <div
        css={{
          alignItems: 'center',
          display: 'flex',
          gap: theme.spacing.small,
          marginBottom: theme.spacing.xsmall,
        }}
      >
        <AppIcon
          icon={<StackTypeIcon stackType={stack.type} />}
          size="xxsmall"
          $boxSize={24} // TODO: Fix in design system.
        />
        <div
          css={{
            ...TRUNCATE,
            ...(active
              ? theme.partials.text.body1Bold
              : theme.partials.text.body1),
            color: active ? theme.colors.text : theme.colors['text-light'],
            flexGrow: 1,
          }}
        >
          {stack.name}
        </div>
        <StackStatusChip
          paused={!!stack.paused}
          deleting={!!stack.deletedAt}
          {...(active ? {} : { severity: 'neutral' })} // TODO: Set to grey.
        />
      </div>
      <div
        css={{
          ...TRUNCATE_LEFT,
          ...theme.partials.text.caption,
          color: theme.colors['text-xlight'],
        }}
      >
        {stack.repository?.url}
      </div>
    </div>
  )

  //   href={}
}
