import { Children, type ReactElement } from 'react'
import { Div, P } from 'honorable'

import Carousel, { type CarouselProps } from './Carousel'

function TipCarousel({ children, ...props }: CarouselProps) {
  return (
    <Carousel {...props}>
      {Children.map(children, (child: ReactElement<any>) => (
        <Div
          width="100%"
          paddingTop="medium"
          paddingBottom="medium"
          paddingHorizontal="medium"
          mb={-0.5}
        >
          <P
            body2
            color="text-light"
            fontStyle="italic"
            textAlign="center"
            {...props}
          >
            {child}
          </P>
        </Div>
      ))}
    </Carousel>
  )
}

export default TipCarousel
