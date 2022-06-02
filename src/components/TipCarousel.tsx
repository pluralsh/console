import { Children } from 'react'
import { Div, P } from 'honorable'

import Carousel, { CarouselProps } from './Carousel'

export default function TipCarousel({ children, ...props }: CarouselProps) {
  return (
    <Carousel {...props}>
      {Children.map(children, (child: any) => (
        <Div
          pt="16px"
          pb="16px"
          mb="-8px" 
          px="16px"
        >
          <P
            body2
            color="text-light"
            fontStyle="italic"
            {...props}
          >{child}
          </P>
        </Div>
      )
      )}
    </Carousel>
  )
}
