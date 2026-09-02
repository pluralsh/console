import { LoopingLogo } from '@pluralsh/design-system'
import { ComponentPropsWithRef, useLayoutEffect } from 'react'
import styled from 'styled-components'

export const LoadingIndicatorWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing.xlarge,
}))

// DEPRECATED: DO NOT USE
// will remove once we've completed the migration to fully using skeleton loaders, they're much cleaner
export default function LoadingIndicator(
  props: ComponentPropsWithRef<typeof LoadingIndicatorWrap>
) {
  return (
    <LoadingIndicatorWrap {...props}>
      <LoopingLogo />
    </LoadingIndicatorWrap>
  )
}

export function FullPageLoadingIndicator() {
  useLayoutEffect(() => {
    const loadingPlaceholder = document.getElementById('loading-placeholder')
    loadingPlaceholder?.classList.add('force-visible')

    return () => loadingPlaceholder?.classList.remove('force-visible')
  }, [])

  return null
}
