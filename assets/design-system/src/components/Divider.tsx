import { Div, Flex, type FlexProps, P } from 'honorable'

type DividerProps = FlexProps & {
  text?: string
  color?: string
  backgroundColor?: string
}

function Divider({
  text,
  color = 'text-light',
  backgroundColor = 'text-light',
  ...props
}: DividerProps) {
  return (
    <Flex
      align="center"
      {...props}
    >
      <Div
        flexGrow={1}
        height={1}
        backgroundColor={backgroundColor}
      />
      {!!text && (
        <>
          <P
            paddingHorizontal="xsmall"
            flexShrink={0}
            color={color}
            size="small"
          >
            {text}
          </P>
          <Div
            flexGrow={1}
            height={1}
            backgroundColor={backgroundColor}
          />
        </>
      )}
    </Flex>
  )
}

export default Divider
