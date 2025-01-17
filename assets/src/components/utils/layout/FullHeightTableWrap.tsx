import { Flex, FlexProps } from 'honorable'

// TODO: this is now folded into tables with fullHeightWrap=true
// all instances should be replaced with that so this component can be removed
export function FullHeightTableWrap(props: FlexProps) {
  return (
    <Flex
      direction="column"
      height="100%"
      overflow="hidden"
      {...props}
    />
  )
}
