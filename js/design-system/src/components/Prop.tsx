import { Div, type DivProps } from 'honorable'
import styled from 'styled-components'

const PropSC = styled.div<{ $margin?: string | number }>(
  ({ $margin, theme }) => ({
    margin: $margin ?? theme.spacing.medium,

    '.prop-title': {
      ...theme.partials.text.caption,
      color: theme.colors['text-xlight'],
      marginBottom: theme.spacing.xxsmall,
    },
  })
)

export default function Prop({
  children,
  title,
  margin,
  ...props
}: {
  title: string
  margin?: string | number
} & DivProps) {
  return (
    <PropSC $margin={margin}>
      <div className="prop-title">{title}</div>
      <Div {...props}>{children}</Div>
    </PropSC>
  )
}
