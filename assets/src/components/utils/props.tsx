import { Div } from "honorable";

export function Prop({ children, title, ...props }: any) {
  return (
    <Div margin={"medium"}>
      <Div
        caption
        color="text-xlight"
        marginBottom={"xxsmall"}
      >
        {title}
      </Div>
      <Div {...props}>{children}</Div>
    </Div>
  )
}

export function PropsContainer({ children, title, ...props }: any) {
    return (
      <Div
        border="1px solid border"
        borderRadius="medium"
        {...props}
      >
        {(!!title && (
          <Div
          overline
            color="text-xlight"
            margin={"medium"}
          >
            {title}
          </Div>
        ))}
        {children}
      </Div>
    )
  }