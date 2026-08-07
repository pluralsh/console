import styled from 'styled-components'

import { Date } from '..'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'Date',
  component: Date,
}

const RootWrap = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xxxlarge,
}))

const Wrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))

function Template() {
  return (
    <RootWrap>
      <Wrap>
        <div>Date</div>
        <Date date="2016-01-08T00:00:00-06:00" />
      </Wrap>

      <Wrap>
        <div>Invalid date</div>
        <Date date="invalid" />
      </Wrap>

      <Wrap>
        <div>Undefined date</div>
        <Date date={undefined} />
      </Wrap>
    </RootWrap>
  )
}

export const Default: StoryFn = Template.bind({})

Default.args = {
  date: '2016-01-08T00:00:00-06:00',
}
