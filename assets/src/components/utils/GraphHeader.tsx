import { Div } from 'honorable'

export default function GraphHeader({ title }: { title: string }) {
  return (
    <Div
      color="text-light"
      justifyContent="center"
      overline
      textAlign="center"
    >
      {title}
    </Div>
  )
}
