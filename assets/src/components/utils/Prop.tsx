import { Div } from 'honorable'
import { ReactElement } from 'react'

// TODO: Export to design system?
export default function Prop({ children, title, ...props }: ReactElement) {
  return (
    <Div margin="medium">
      <Div
        caption
        color="text-xlight"
        marginBottom="xxsmall"
      >
        {title}
      </Div>
      <Div {...props}>{children}</Div>
    </Div>
  )
}
