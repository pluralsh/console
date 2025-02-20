import { DivProps, H1 } from 'honorable'
import { ComponentPropsWithRef, ReactNode } from 'react'
import styled from 'styled-components'

export type PageTitleProps = {
  heading?: ReactNode
  headingProps?: DivProps
} & ComponentPropsWithRef<typeof WrapperSC>

export default function ConsolePageTitle({
  heading,
  headingProps = {},
  children,
  ...props
}: PageTitleProps) {
  return (
    <WrapperSC {...props}>
      {heading && (
        <H1
          title2
          paddingTop="0.2em" // optically center title
          {...headingProps}
        >
          {heading}
        </H1>
      )}
      {children}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.large,
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',
  minHeight: 40,
}))
