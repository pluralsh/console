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
        direction="column"
        gap="xsmall"
        minWidth={0}
      >
        <Flex
          align="center"
          gap="small"
        >
          <AppIcon
            icon={
              <StackTypeIcon
                stackType={stack.type}
                size={16}
              />
            }
            size="xxxsmall"
          />
          <NameSC $active={active}>{stack.name}</NameSC>
        </Flex>
        <CaptionP
          $color="text-xlight"
          css={{ ...TRUNCATE_LEFT }}
        >
          {stack.repository?.url}
        </CaptionP>
      </Flex>
      <StackStatusChipAlt stack={stack} />
    </WrapperSC>
  )
}

const WrapperSC = styled.div<{ $active: boolean; $first: boolean }>(
  ({ theme, $active, $first }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.large,
    alignItems: 'center',
    padding: theme.spacing.medium,
    borderLeft: theme.borders.default,
    borderRight: $active
      ? `2px solid ${theme.colors['border-primary']}`
      : theme.borders.default,
    borderBottom: theme.borders.default,
    ...(theme.mode === 'light' && {
      // White on page-background — never transparent (same as page grey)
      backgroundColor: theme.colors['fill-zero'],
    }),

    ...($active
      ? {
          backgroundColor: theme.colors['fill-zero-selected'],
          cursor: 'default',
        }
      : {
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
