import styled from 'styled-components'

import { type ComponentProps } from 'react'

import { MediaWrap } from './MediaWrap'

export function Figure(props: ComponentProps<typeof MediaWrap>) {
  return (
    <MediaWrap
      as="figure"
      {...props}
    />
  )
}

export const FigCaption = styled.figcaption(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  textAlign: 'center',
  marginTop: theme.spacing.xsmall,
}))
