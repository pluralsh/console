import { Div, type DivProps } from 'honorable'
import styled from 'styled-components'

const PropSC = styled.div(({ theme }) => ({
  margin: theme.spacing.medium,

  '.prop-title': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    marginBottom: theme.spacing.xxsmall,
  },
}))

export default function Prop({
  children,
  title,
  ...props
}: {
  title: string
} & DivProps) {
  return (
    <PropSC>
      <div className="prop-title">{title}</div>
      <Div {...props}>{children}</Div>
    </PropSC>
  )
}
