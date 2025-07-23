import styled from 'styled-components'
import { CaretDownIcon, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { ButtonHTMLAttributes, DetailedHTMLProps } from 'react'

export const ChatInputSelectButton = styled(
  ({
    ref,
    tooltip,
    children,
    ...props
  }: {
    tooltip?: string
  } & DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >) => (
    <WrapWithIf
      condition={!!tooltip}
      wrapper={<Tooltip label={tooltip} />}
    >
      <button
        ref={ref}
        {...props}
      >
        {children}
        <CaretDownIcon
          size={12}
          className="dropdownIcon"
        />
      </button>
    </WrapWithIf>
  )
)<{ isOpen?: boolean }>(({ theme, isOpen = false }) => ({
  ...theme.partials.reset.button,
  alignItems: 'center',
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  fontSize: 12,
  gap: theme.spacing.xxsmall,
  height: 18,
  padding: `${theme.spacing.xxxsmall}px ${theme.spacing.xsmall}px`,

  '&:hover': {
    backgroundColor: theme.colors['fill-three-hover'],
  },

  '&:focus': {
    backgroundColor: theme.colors['fill-three-selected'],
  },

  '.dropdownIcon': {
    transform: isOpen ? 'scaleY(-1)' : 'scaleY(1)',
    transition: 'transform 0.1s ease',
  },
}))
