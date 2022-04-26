import { PropsWithChildren } from 'react'
import { Div, P } from 'honorable'

type TagProps = PropsWithChildren<typeof Div>

const propTypes = {}

function Tag({ children, ...props }: TagProps) {
  return (
    <Div
      px={0.5}
      xflex="x4"
      display="inline-block"
      backgroundColor="background-light"
      borderRadius={1000}
      {...props}
    >
      <P size="small">
        {children}
      </P>
    </Div>
  )
}

Tag.propTypes = propTypes

export default Tag
