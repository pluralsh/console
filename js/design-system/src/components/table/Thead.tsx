import { type ComponentPropsWithRef } from 'react'
import styled from 'styled-components'

import { FillLevelProvider } from '../contexts/FillLevelContext'

function TheadUnstyled({ ...props }: ComponentPropsWithRef<'thead'>) {
  return (
    <FillLevelProvider value={2}>
      <thead {...props} />
    </FillLevelProvider>
  )
}

export const Thead = styled(TheadUnstyled)(() => ({
  display: 'contents',
  position: 'sticky',
  top: 0,
  zIndex: 3,
}))
