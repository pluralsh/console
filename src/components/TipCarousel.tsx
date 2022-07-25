import {
  Children, ReactElement, Ref, forwardRef,
} from 'react'
import { Div, P } from 'honorable'

import Carousel, { CarouselProps } from './Carousel'

const propTypes = {}

function TipCarouselRef({ children, ...props }: CarouselProps, ref: Ref<any>) {
  return (
    <Carousel
      ref={ref}
      {...props}
    >
      {Children.map(children, (child: ReactElement) => (
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

const TipCarousel = forwardRef(TipCarouselRef)

TipCarousel.propTypes = propTypes

export default TipCarousel
