import { ReactNode } from 'react'
import styled from 'styled-components'

export function WorkbenchEmptyState({
  message,
  description,
  children,
  variant = 'card',
  inset = true,
  className,
}: {
  message: string
  description?: ReactNode
  children?: ReactNode
  // 'plain' drops the card chrome, for use inside an existing card or panel
  variant?: 'card' | 'plain'
  // false when the parent already pads its content
  inset?: boolean
  className?: string
}) {
  return (
    <OuterSC
      $inset={inset}
      className={className}
    >
      <CardSC $plain={variant === 'plain'}>
        <MessageSC>{message}</MessageSC>
        {description && <DescriptionSC>{description}</DescriptionSC>}
        {children && <ActionsSC>{children}</ActionsSC>}
      </CardSC>
    </OuterSC>
  )
}

// for narrow sidebars and columns, where a card would be too heavy
export function WorkbenchEmptyText({ children }: { children: ReactNode }) {
  return <EmptyTextSC>{children}</EmptyTextSC>
}

const OuterSC = styled.div<{ $inset: boolean }>(({ theme, $inset }) => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  ...($inset && { padding: theme.spacing.large }),
}))

const CardSC = styled.div<{ $plain: boolean }>(({ theme, $plain }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0,
  padding: theme.spacing.xlarge,
  textAlign: 'center',
  ...(!$plain && {
    border: theme.borders.default,
    borderRadius: theme.borderRadiuses.large,
    backgroundColor: theme.colors['fill-one'],
  }),
}))

const MessageSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body1Bold,
  color: theme.colors.text,
  margin: 0,
}))

const DescriptionSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  margin: `${theme.spacing.xxsmall}px 0 0`,
  maxWidth: 480,
  overflowWrap: 'anywhere',
  textWrap: 'pretty',
}))

const ActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: theme.spacing.small,
  marginTop: theme.spacing.medium,
}))

const EmptyTextSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],
  margin: `${theme.spacing.large}px auto`,
  padding: `0 ${theme.spacing.medium}px`,
  textAlign: 'center',
}))
