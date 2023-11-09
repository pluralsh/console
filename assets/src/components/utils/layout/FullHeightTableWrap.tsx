import { Flex, FlexProps } from 'honorable'
import { forwardRef } from 'react'

export const FullHeightTableWrap = forwardRef<HTMLElement, FlexProps>(
  (props, ref) => (
    <Flex
      ref={ref}
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
)
