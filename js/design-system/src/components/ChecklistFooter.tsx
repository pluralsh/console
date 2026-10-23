import { type ComponentPropsWithRef, type JSX } from 'react'
import styled from 'styled-components'

const ChecklistFooter = styled(ChecklistFooterUnstyled)(({ theme }) => ({
  padding: `${theme.spacing.medium} ${theme.spacing.large}`,
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
