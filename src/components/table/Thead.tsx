import { type ComponentProps, forwardRef } from 'react'
import styled from 'styled-components'

import { FillLevelProvider } from '../contexts/FillLevelContext'

const TheadUnstyled = forwardRef<
  HTMLTableSectionElement,
  ComponentProps<'thead'>
>((props, ref) => (
  <FillLevelProvider value={2}>
    <thead
      {...props}
      ref={ref}
    />
  </FillLevelProvider>
))

export const Thead = styled(TheadUnstyled)(() => ({
  display: 'contents',
  position: 'sticky',
  top: 0,
  zIndex: 3,
}))
