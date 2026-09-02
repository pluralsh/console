import { CaretDownIcon, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { ComponentPropsWithRef } from 'react'
import styled from 'styled-components'

export function ChatInputSelectButton({
  tooltip,
  isOpen,
  children,
  ...props
}: {
  tooltip?: string
  isOpen?: boolean
} & ComponentPropsWithRef<'button'>) {
  return (
    <WrapWithIf
      condition={!!tooltip}
      wrapper={<Tooltip label={tooltip} />}
    >
      <ChatInputSelectButtonSC
        $isOpen={isOpen}
        // props need to be spread to capture ref and handlers injected by Select component
        {...props}
      >
        {children}
        <CaretDownIcon
          size={12}
          className="dropdownIcon"
        />
      </ChatInputSelectButtonSC>
    </WrapWithIf>
  )
}

const ChatInputSelectButtonSC = styled.button<{ $isOpen?: boolean }>(
  ({ theme, $isOpen = false }) => ({
    ...theme.partials.reset.button,
    alignItems: 'center',
    borderRadius: theme.borderRadiuses.medium,
    display: 'flex',
    fontSize: 12,
    gap: theme.spacing.xxsmall,
    height: 18,
    padding: `${theme.spacing.xxxsmall}px ${theme.spacing.xsmall}px`,
    '&:hover': { backgroundColor: theme.colors['fill-three-hover'] },
    '&:focus': { backgroundColor: theme.colors['fill-three-selected'] },
    '.dropdownIcon': {
      transform: $isOpen ? 'scaleY(-1)' : 'scaleY(1)',
      transition: 'transform 0.1s ease',
    },
  })
)
