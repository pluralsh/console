import { Modal } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import styled from 'styled-components'

const ModalAltSC = styled(Modal)(({ theme, actions }) => ({
  padding: 0,
  '&&': {
    '& > div > div:first-child, & > form > div:first-child': {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.large,
      paddingBottom: theme.spacing.large,
    },
  },
  '.header': {
    ...theme.partials.text.subtitle1,
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
  size = 'large',
  children,
  actions,
  asForm = false,
  formProps = {},
  ...props
}: ComponentProps<typeof ModalAltSC> & {
  asForm?: boolean
  formProps?: ComponentProps<'form'>
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
      {header && <h2 className="header">{header}</h2>}
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
