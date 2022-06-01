import { A, Button, ButtonProps, Div, DivProps, Flex, P, PProps } from 'honorable'
import { Children, useState } from 'react'

import { keyframes } from '@emotion/react'

export type Props = {
  mode?: 'indeterminate' | 'determinate',
  paused?: boolean,
  progress?: number, 
  complete?: boolean,
}

function Dot({ active = false, ...props }: { active?: boolean } & DivProps) {
  return (
    <Div
      padding="4px"
      cursor="pointer"
      {...props}
    >
      <Div
        backgroundColor={active ? 'link-inline' : 'fill-two'}
        width="8px"
        height="8px"
        borderRadius="4px"
      />
    </Div>
  )
}

function FlexItem(props: DivProps) {
  return (
    <Div
      width="100%"
    //   backgroundColor="blue"
    //   outline="1px solid green"
      flexShrink="0"
      textAlign="center"
      {...props}
    />
  )
}

function TextCarouselItem(props:PProps) {
  return (
    <P
      color="text-light"
      
      {...props}
    />
  )
}

export default function Carousel({ children, ...props }: DivProps) {
  [activeIndex, setActiveIndex] = useState(0)

  return (
    <Div>
      <Flex
        mt="16px"
        overflow="hidden"
        alignItems="center"
      >
        {Children.map(children, (child: any, i: any) => (
          <FlexItem transform={`translateX(${-i * 100}%)`}>
            {child}
          </FlexItem>
        )
        )}
      </Flex>

      <Flex
        mt="8px"
      >
        <Dot /><Dot /><Dot /><Dot />
      </Flex>
    </Div>
  )

}
