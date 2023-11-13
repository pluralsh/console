import { Modal } from '@pluralsh/design-system'
import { ComponentProps, ReactNode } from 'react'
import styled from 'styled-components'

const ModalAltSC = styled(Modal)(({ theme, actions }) => ({
  padding: 0,
  '&&': {
    '> div > div:first-child': {
      // Fixes z-index issue with gql error border
      // TODO: Fix this in design system modal
      position: 'relative',
      zIndex: 0,
    },
    '& > div > div:first-child, & > form > div:first-child': {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.large,
      paddingBottom: theme.spacing.large,
    },
  },
  '.headerArea': {
    display: 'flex',
    gap: theme.spacing.large,
  },
  '.header': {
    ...theme.partials.text.subtitle1,
    flexShrink: 1,
  },
  '.headerContent': {
    flexGrow: 1,
  },
  '.actions': {
    display: 'flex',
    width: '100%',
    flexDirection: 'row-reverse',
    gap: theme.spacing.medium,
    justifyContent: 'flex-start',
    borderTop: theme.borders.default,
    paddingTop: theme.spacing.large,
  },
  ...(actions
    ? {
        '& > div > *:last-child, & > form > *:last-child': {
          '& > :first-child': {
            display: 'none',
            backgroundColor: 'red',
          },
          '& > :last-child': {
            paddingTop: 0,
          },
        },
      }
    : {}),
}))

export default function ModalAlt({
  header,
  headerContent,
  size = 'large',
  children,
  actions,
  asForm = false,
  formProps = {},
  ...props
}: ComponentProps<typeof ModalAltSC> & {
  asForm?: boolean
  formProps?: ComponentProps<'form'>
  headerContent?: ReactNode
}) {
  return (
    <ModalAltSC
      size={size}
      padding={0}
      fade
      asForm={asForm}
      formProps={formProps}
      actions={actions ? <div className="actions">{actions}</div> : undefined}
      {...props}
    >
      {header && (
        <div className="headerArea">
          <h2 className="header">{header}</h2>
          <div className="headerContent">{headerContent}</div>
        </div>
      )}
      {children}
    </ModalAltSC>
  )
}

export const StepH = styled.h3(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
}))
export const StepBody = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
}))
export const StepLink = styled.a(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))
