import { Children, ReactElement } from 'react'
import { Div, P } from 'honorable'

import Carousel, { CarouselProps } from './Carousel'

export default function TipCarousel({ children, ...props }: CarouselProps) {
  return (
    <Carousel {...props}>
      {Children.map(children, (child: ReactElement) => (
        <Div
          width="100%"
          pt={1}
          pb={1}
          px={1}
          mb={-0.5}
        >
          <P
            body2
            color="text-light"
            fontStyle="italic"
            textAlign="center"
            {...props}
          >{child}
          </P>
        </Div>
      )
      )}
    </Carousel>
  )
}
