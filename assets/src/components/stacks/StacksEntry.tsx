import { AppIcon, Flex } from '@pluralsh/design-system'

import styled from 'styled-components'

import { useNavigate } from 'react-router-dom'

import { StackTinyFragment } from '../../generated/graphql'
import { TRUNCATE, TRUNCATE_LEFT } from '../utils/truncate'

import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'

import { CaptionP } from 'components/utils/typography/Text'
import { StackStatusChipAlt } from './common/StackStatusChip'
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
  const navigate = useNavigate()

  return (
    <WrapperSC
      $active={active}
      $first={first}
      onClick={() => !active && navigate(getStacksAbsPath(stack.id))}
    >
      <Flex
        align="center"
        gap="small"
      >
        <AppIcon
          icon={<StackTypeIcon stackType={stack.type} />}
          size="xxsmall"
          $boxSize={24}
        />
        <NameSC $active={active}>{stack.name}</NameSC>
        <StackStatusChipAlt stack={stack} />
      </Flex>
      <CaptionP
        $color="text-xlight"
        css={{ ...TRUNCATE_LEFT }}
      >
        {stack.repository?.url}
      </CaptionP>
    </WrapperSC>
  )
}

const WrapperSC = styled.div<{ $active: boolean; $first: boolean }>(
  ({ theme, $active, $first }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
    padding: theme.spacing.medium,
    borderLeft: theme.borders.default,
    borderRight: theme.borders.default,

    ...($active
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

    ...($first ? { borderTop: theme.borders.default } : {}),
  })
)

const NameSC = styled.span<{ $active: boolean }>(({ theme, $active }) => ({
  ...TRUNCATE,
  ...($active ? theme.partials.text.body1Bold : theme.partials.text.body1),
  color: $active ? theme.colors.text : theme.colors['text-light'],
  flexGrow: 1,
}))
