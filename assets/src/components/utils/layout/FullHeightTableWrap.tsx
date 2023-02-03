import { Flex, FlexProps } from 'honorable'

export function FullHeightTableWrap(props: FlexProps) {
  return (
    <Flex
      direction="column"
      height="100%"
      overflow="hidden"
      {...{
        '& > div': {
          maxHeight: '100%',
        },
      }}
      {...props}
    />
  )
}
