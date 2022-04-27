import { Div, DivProps, P } from 'honorable'

type TagProps = DivProps

const propTypes = {}

function Tag({ children, ...props }: TagProps) {
  return (
    <Div
      py={0.25}
      px={0.5}
      xflex="x4"
      display="inline-block"
      backgroundColor="background-middle"
      borderRadius={1000}
      {...props}
    >
      <P body3>
        {children}
      </P>
    </Div>
  )
}

Tag.propTypes = propTypes

export default Tag
