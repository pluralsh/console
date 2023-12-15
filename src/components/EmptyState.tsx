import {
  type ComponentProps,
  type ReactElement,
  type Ref,
  forwardRef,
} from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

type EmptyStateProps = ComponentProps<typeof EmptyStateSC> & {
  message: string
  description?: string
  icon?: ReactElement
}

const propTypes = {
  message: PropTypes.string.isRequired,
  description: PropTypes.string,
  icon: PropTypes.element,
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

function EmptyStateRef(
  { message, description, icon = null, children, ...props }: EmptyStateProps,
  ref: Ref<any>
) {
  return (
    <EmptyStateSC
      ref={ref}
      {...props}
    >
      {icon && <IconSC>{icon}</IconSC>}
      <MessageSC>{message}</MessageSC>
      {description && <DescriptionSC>{description}</DescriptionSC>}
      {children}
    </EmptyStateSC>
  )
}

const EmptyState = forwardRef(EmptyStateRef)

EmptyState.propTypes = propTypes

export default EmptyState
