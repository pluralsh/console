import { Modal, WrapWithIf } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import styled from 'styled-components'

const ModalAltSC = styled(Modal)(({ theme }) => ({
  padding: 0,
  '&&': {
    padding: theme.spacing.medium,
    '& > div, .form': {
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.large,
    },
  },
  '.header': {
    ...theme.partials.text.subtitle1,
  },
  '.actions': {
    display: 'flex',
    flexDirection: 'row-reverse',
    gap: theme.spacing.medium,
    justifyContent: 'flex-start',
    borderTop: theme.borders.default,
    paddingTop: theme.spacing.large,
  },
}))

export default function ModalAlt({
  header,
  size = 'large',
  children,
  actions,
  asForm,
  formProps,
  ...props
}: ComponentProps<typeof ModalAltSC> & {
  asForm: boolean
  formProps: ComponentProps<'form'>
}) {
  return (
    <ModalAltSC
      size={size}
      padding={0}
      fade
      {...props}
    >
      <WrapWithIf
        condition={asForm}
        wrapper={
          <form
            className="form"
            {...(formProps || {})}
          />
        }
      >
        <h2 className="header">{header}</h2>
        {children}
        {actions && <footer className="actions">{actions}</footer>}
      </WrapWithIf>
    </ModalAltSC>
  )
}

export const StepH = styled.h3(({ theme }) => ({
  ...theme.partials.text.body2Bold,
}))
export const StepBody = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
}))
export const StepLink = styled.a(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))
