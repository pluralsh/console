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
}: {
  stack: StackTinyFragment
  active: boolean
}) {
  const navigate = useNavigate()

  return (
    <WrapperSC
      $active={active}
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

const WrapperSC = styled.div<{ $active: boolean }>(({ theme, $active }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  alignItems: 'center',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders.default,
  ...($active
    ? {
        // matches PageSidebarNav's active item
        backgroundColor: theme.colors['fill-zero-selected'],
        boxShadow: `inset -2px 0 0 ${theme.colors['border-primary']}`,
        cursor: 'default',
      }
    : {
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: theme.colors['fill-zero-hover'],
        },
      }),
}))

const NameSC = styled.span<{ $active: boolean }>(({ theme, $active }) => ({
  ...TRUNCATE,
  ...($active ? theme.partials.text.body2Bold : theme.partials.text.body2),
  color: $active ? theme.colors.text : theme.colors['text-light'],
  flexGrow: 1,
}))
