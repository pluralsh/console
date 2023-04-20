import { type ComponentPropsWithRef } from 'react'
import styled from 'styled-components'

const ChecklistFooter = styled(ChecklistFooterUnstyled)(({ theme }) => ({
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  height: 64,
}))

type ChecklistFooterProps = ComponentPropsWithRef<'div'>

function ChecklistFooterUnstyled({
  children,
  ...props
}: ChecklistFooterProps): JSX.Element {
  return <div {...props}>{children}</div>
}

export type { ChecklistFooterProps }
export { ChecklistFooter }
