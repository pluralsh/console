import { Children, type ComponentPropsWithRef } from 'react'
import styled from 'styled-components'

import Carousel from './Carousel'

function TipCarousel({
  children,
  ...props
}: ComponentPropsWithRef<typeof Carousel>) {
  return (
    <Carousel {...props}>
      {Children.toArray(children).map((child, i) => (
        <SlideSC key={i}>
          <TipSC>{child}</TipSC>
        </SlideSC>
      ))}
    </Carousel>
  )
}

const SlideSC = styled.div(({ theme }) => ({
  width: '100%',
  padding: theme.spacing.medium,
  marginBottom: -0.5,
}))

const TipSC = styled.p(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  fontStyle: 'italic',
  textAlign: 'center',
}))

export default TipCarousel
