import { AppIcon } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { useNavigate } from 'react-router-dom'

import { StackTinyFragment } from '../../generated/graphql'
import { TRUNCATE, TRUNCATE_LEFT } from '../utils/truncate'

import {
  getStacksAbsPath,
  STACK_INSIGHTS_REL_PATH,
} from '../../routes/stacksRoutesConsts'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import StackStatusChip from './common/StackStatusChip'
import { StackTypeIcon } from './common/StackTypeIcon'

export function StackEntry({
  stack,
  active,
  first,
}: {
  stack: StackTinyFragment
  active: boolean
  first: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { ai } = useDeploymentSettings()

  return (
    <div
      onClick={() => {
        if (!active) navigate(getStacksAbsPath(stack.id))
      }}
      css={{
        padding: theme.spacing.medium,
        borderLeft: theme.borders.default,
        borderRight: theme.borders.default,

        ...(active
          ? {
              backgroundColor: theme.colors['fill-zero-selected'],
              borderBottom: `2px solid ${theme.colors['border-primary']}`,
              cursor: 'default',
              marginBottom: -1,
              zIndex: theme.zIndexes.base + 1,
            }
          : {
              borderBottom: theme.borders.default,
              cursor: 'pointer',

              '&:hover': {
                backgroundColor: theme.colors['fill-zero-hover'],
              },
            }),

        ...(first ? { borderTop: theme.borders.default } : {}),
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
          $boxSize={24}
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
        {ai?.enabled && (
          <AiInsightSummaryIcon
            navPath={`${getStacksAbsPath(stack.id)}/${STACK_INSIGHTS_REL_PATH}`}
            insight={stack.insight}
          />
        )}
        <StackStatusChip
          status={stack.status}
          deleting={!!stack.deletedAt}
          css={{ whiteSpace: 'nowrap' }}
          style={{
            '.children': {
              color: active ? undefined : theme.colors['text-xlight'],
            },
          }}
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
}
