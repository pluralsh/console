import { Flex } from 'honorable'

export const RESPONSIVE_LAYOUT_CONTENT_WIDTH = 896

export function ResponsiveLayoutContentContainer(props: any) {
  return (
    <Flex
      direction="column"
      flexGrow={1}
      flexShrink={1}
      height="100%"
      maxHeight="100%"
      width={RESPONSIVE_LAYOUT_CONTENT_WIDTH}
      maxWidth-desktopLarge-up={RESPONSIVE_LAYOUT_CONTENT_WIDTH}
      width-desktopLarge-up={RESPONSIVE_LAYOUT_CONTENT_WIDTH}
      overflowY="auto"
      overflowX="hidden"
      {...props}
    />
  )
}
