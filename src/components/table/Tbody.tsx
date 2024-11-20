import { type ComponentProps, forwardRef } from 'react'
import styled from 'styled-components'

import { FillLevelProvider } from '../contexts/FillLevelContext'

const TbodyUnstyled = forwardRef<
  HTMLTableSectionElement,
  ComponentProps<'tbody'>
>((props, ref) => (
  <FillLevelProvider value={1}>
    <tbody
      ref={ref}
      {...props}
    />
  </FillLevelProvider>
))

export const Tbody = styled(TbodyUnstyled)(() => ({
  display: 'contents',
}))
