import { ArrowCornerUpIcon, SpinnerAlt } from '@pluralsh/design-system'
import { ChatSubmitButton } from 'components/ai/chatbot/input/ChatInput'
import type { ComponentProps } from 'react'
import styled, { useTheme } from 'styled-components'

const CONTROL_SIZE = 32

export const WorkbenchPromptOptionsGroup = styled.div(({ theme }) => {
  const radius = theme.borderRadiuses.medium

  return {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: theme.spacing.xsmall,
    minHeight: CONTROL_SIZE,
    minWidth: 0,
    '& > *:not(:first-child)': { marginLeft: -1 },
    '& > *:hover, & > *:focus-within': { position: 'relative', zIndex: 1 },
    '&&& .chatOptionPill': { borderRadius: 0 },
    '&&& > .chatOptionPill:first-child, &&& > :first-child .chatOptionPill': {
      borderTopLeftRadius: radius,
      borderBottomLeftRadius: radius,
    },
    '&&& > .chatOptionPill:last-child, &&& > :last-child .chatOptionPill': {
      borderTopRightRadius: radius,
      borderBottomRightRadius: radius,
    },
  }
})

export function WorkbenchPromptSubmitButton({
  loading = false,
  ...props
}: Omit<ComponentProps<typeof ChatSubmitButton>, 'icon' | 'loadingIndicator'>) {
  const { spacing, borderRadiuses } = useTheme()

  return (
    <ChatSubmitButton
      icon={<ArrowCornerUpIcon />}
      loading={loading}
      loadingIndicator={<SpinnerAlt color="icon-xlight" />}
      css={{
        position: 'absolute',
        bottom: spacing.small,
        right: spacing.small,
        width: CONTROL_SIZE,
        height: CONTROL_SIZE,
        borderRadius: borderRadiuses.medium,
      }}
      {...props}
    />
  )
}

export function WorkbenchPromptCancelButton(
  props: ComponentProps<typeof CancelButtonSC>
) {
  return (
    <CancelButtonSC
      type="button"
      aria-label="Cancel job"
      {...props}
    >
      <CancelIconSC />
    </CancelButtonSC>
  )
}

const CancelButtonSC = styled.button(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing.small,
  right: theme.spacing.small,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: CONTROL_SIZE,
  width: CONTROL_SIZE,
  minHeight: 0,
  borderRadius: theme.borderRadiuses.medium,
  border: 'none',
  background: theme.colors['fill-two'],
  cursor: 'pointer',
  '&:hover': { background: theme.colors['fill-three'] },
}))

const CancelIconSC = styled.div(({ theme }) => ({
  height: 10,
  width: 10,
  borderRadius: 2,
  background: theme.colors['icon-light'],
  flexShrink: 0,
}))
