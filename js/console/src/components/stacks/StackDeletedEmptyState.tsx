import { Flex, StackRunPendingIcon } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

export function StackDeletedEmptyState() {
  const theme = useTheme()

  return (
    <WrapperSC>
      <Flex
        flexDirection="column"
        alignItems="center"
        gap="medium"
      >
        <StackRunPendingIcon
          size={theme.spacing.xxlarge}
          color={theme.colors['icon-danger']}
        />
        <Flex
          flexDirection="column"
          alignItems="center"
        >
          <span css={theme.partials.text.body1}>
            This stack has been deleted
          </span>
          <span
            css={{
              ...theme.partials.text.body2,
              color: theme.colors['text-light'],
            }}
          >
            Switch to a different stack to continue.
          </span>
        </Flex>
      </Flex>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  height: '100%',
  width: '100%',
  padding: theme.spacing.xxxlarge,
}))
