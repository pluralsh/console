import { type ComponentPropsWithRef } from 'react'
import styled from 'styled-components'

import { FillLevelProvider } from '../contexts/FillLevelContext'

function TbodyUnstyled({ ...props }: ComponentPropsWithRef<'tbody'>) {
  return (
    <FillLevelProvider value={1}>
      <tbody {...props} />
    </FillLevelProvider>
  )
}

export const Tbody = styled(TbodyUnstyled)(() => ({
  display: 'contents',
}))
