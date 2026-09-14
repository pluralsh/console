import { Children, type ReactElement } from 'react'
import { Div } from 'honorable'
import styled from 'styled-components'

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
          <TipSC>{child}</TipSC>
        </Div>
      ))}
    </Carousel>
  )
}

const TipSC = styled.p(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  fontStyle: 'italic',
  textAlign: 'center',
}))

export default TipCarousel
