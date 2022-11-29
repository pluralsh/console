import { Div } from 'honorable'

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
          margin="medium"
        >
          {title}
        </Div>
      ))}
      {children}
    </Div>
  )
}
