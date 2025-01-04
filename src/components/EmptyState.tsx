import { type ComponentProps, type ReactElement } from 'react'
import styled from 'styled-components'

export type EmptyStateProps = ComponentProps<typeof EmptyStateSC> & {
  message: string
  description?: string
  icon?: ReactElement<any>
}

const EmptyStateSC = styled.div(({ theme }) => ({
  padding: theme.spacing.xxlarge,
  gap: theme.spacing.medium,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}))
const MessageSC = styled.p(({ theme }) => ({
  ...theme.partials.text.subtitle1,
  margin: 0,
  textAlign: 'center',
}))
const DescriptionSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body1,
  color: 'text-light',
  margin: 0,
  textAlign: 'center',
}))
const IconSC = styled.div(({ theme }) => ({
  marginBottom: theme.spacing.large,
}))

function EmptyState({
  message,
  description,
  icon = null,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <EmptyStateSC {...props}>
      {icon && <IconSC>{icon}</IconSC>}
      <MessageSC>{message}</MessageSC>
      {description && <DescriptionSC>{description}</DescriptionSC>}
      {children}
    </EmptyStateSC>
  )
}

export default EmptyState
