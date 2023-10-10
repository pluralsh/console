import { Div, type DivProps } from 'honorable'
import styled from 'styled-components'

const PropsContainerSC = styled(Div)(({ theme }) => ({
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.medium,

  '.container-title': {
    ...theme.partials.text.overline,
    color: theme.colors['text-xlight'],
    margin: theme.spacing.medium,
  },
}))

export default function PropsContainer({
  children,
  title,
  ...props
}: {
  title: string
} & DivProps) {
  return (
    <PropsContainerSC {...props}>
      {title && <div className="container-title">{title}</div>}
      {children}
    </PropsContainerSC>
  )
}
