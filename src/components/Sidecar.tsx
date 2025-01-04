import {
  Button,
  type ButtonProps,
  Div,
  type DivProps,
  Section,
  type SectionProps,
} from 'honorable'
import { type ComponentProps, type ReactNode } from 'react'
import styled from 'styled-components'

export type SidecarProps = {
  heading?: ReactNode
  headingProps?: ComponentProps<typeof ItemHeadingSC>
  contentProps?: ComponentProps<typeof ItemContentSC>
}

const SidecarSC = styled(Section)(({ theme }) => ({
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.medium,
  padding: theme.spacing.medium,
}))
const SidecarHeadingSC = styled.h1(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  marginBottom: theme.spacing.medium,
}))

function Sidecar({
  ref,
  heading,
  headingProps,
  children,
  ...props
}: SidecarProps & SectionProps) {
  return (
    <SidecarSC
      ref={ref}
      {...props}
    >
      {heading && (
        <SidecarHeadingSC {...headingProps}>{heading}</SidecarHeadingSC>
      )}
      {children}
    </SidecarSC>
  )
}

const ItemSC = styled(Div)(({ theme }) => ({
  marginBottom: theme.spacing.large,
  '&:last-of-type': {
    marginBottom: 0,
  },
}))
const ItemHeadingSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  marginBottom: theme.spacing.xxsmall,
}))
const ItemContentSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
  overflowWrap: 'anywhere',
}))

function SidecarItem({
  ref,
  heading,
  headingProps,
  contentProps,
  children,
  ...props
}: SidecarProps & DivProps) {
  return (
    <ItemSC
      ref={ref}
      {...props}
    >
      {heading && <ItemHeadingSC {...headingProps}>{heading}</ItemHeadingSC>}
      {children && <ItemContentSC {...contentProps}>{children}</ItemContentSC>}
    </ItemSC>
  )
}

function SidecarButton({ ref, ...props }: ButtonProps) {
  return (
    <Button
      ref={ref}
      tertiary
      {...{
        width: '100%',
        [`> :nth-child(${props.startIcon ? '2' : '1'})`]: {
          flexGrow: 1,
          justifyContent: 'start',
        },
      }}
      {...props}
    />
  )
}

export default Sidecar
export { SidecarButton, SidecarItem }
