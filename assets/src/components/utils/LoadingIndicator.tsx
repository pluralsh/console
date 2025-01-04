import { LoopingLogo } from '@pluralsh/design-system'
import { ComponentPropsWithRef } from 'react'
import styled from 'styled-components'

export const LoadingIndicatorWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing.xlarge,
}))

export default function LoadingIndicator(
  props: ComponentPropsWithRef<typeof LoadingIndicatorWrap>
) {
  return (
    <LoadingIndicatorWrap {...props}>
      <LoopingLogo />
    </LoadingIndicatorWrap>
  )
}
