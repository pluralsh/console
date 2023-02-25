import styled from 'styled-components'

import { MediaWrap } from './MediaWrap'

export function Figure(props) {
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
