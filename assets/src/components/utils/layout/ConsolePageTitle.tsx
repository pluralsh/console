import { ComponentPropsWithRef, ReactNode } from 'react'
import styled, { StyledObject } from 'styled-components'

export type PageTitleProps = {
  heading?: ReactNode
  headingProps?: StyledObject
} & ComponentPropsWithRef<typeof WrapperSC>

export default function ConsolePageTitle({
  heading,
  headingProps = {},
  children,
  ...props
}: PageTitleProps) {
  return (
    <WrapperSC {...props}>
      {heading && <HeadingSC css={{ ...headingProps }}>{heading}</HeadingSC>}
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

const HeadingSC = styled.h1(({ theme }) => ({
  ...theme.partials.text.title2,
  margin: 0,
  paddingTop: '0.1em', // optically center title
}))
