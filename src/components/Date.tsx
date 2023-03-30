import { Span } from 'honorable'

import moment from 'moment'
import styled from 'styled-components'

const Wrap = styled.div({
  display: 'flex',
  flexDirection: 'column',
})

const D = styled.span({
  whiteSpace: 'nowrap',
})

const T = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  gap: theme.spacing.xxxlarge,
  whiteSpace: 'nowrap',
}))

export default function Date({ date }: { date: moment.MomentInput }) {
  if (!date) return <Span>n/a</Span>

  return (
    <Wrap>
      <D>{moment(date).format('ll')}</D>
      <T>{moment(date).format('h:mm A')}</T>
    </Wrap>
  )
}
