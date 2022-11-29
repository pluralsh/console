import { Div } from 'honorable'

export default function Prop({ children, title, ...props }: any) {
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
