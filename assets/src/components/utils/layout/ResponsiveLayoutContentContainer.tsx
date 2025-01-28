import { Flex, FlexProps } from 'honorable'

export const RESPONSIVE_LAYOUT_CONTENT_WIDTH = 896

export function ResponsiveLayoutContentContainer({ ref, ...props }: FlexProps) {
  return (
    <Flex
      ref={ref}
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
