import { Div, Flex } from 'honorable'

import { useState } from 'react'

import { FillLevel } from '../components/contexts/FillLevelContext'
import { Callout, CalloutProps, Card } from '..'

export default {
  title: 'Callout',
  component: Callout,
  argTypes: {
    size: {
      options: ['full', 'compact'],
      control: { type: 'select' },
    },
    onFillLevel: {
      options: [0, 1, 2, 3],
      control: {
        type: 'select',
        labels: {
          0: '0',
          1: '1',
          2: '2',
          3: "3 - Shouldn't be used",
        },
      },
    },
  },
}

const styles: CalloutProps['severity'][] = [
  'info',
  'success',
  'warning',
  'danger',
]

const fullContent = (
  <>
    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
    tempor <a href="">incididunt ut labore</a> et dolore magna aliqua. Ut enim ad minim veniam,
    quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
    consequat.
  </>
)

const compactContent = (
  <>Lorem ipsum dolor sit amet, consectetur <a href="">adipiscing elit</a>, sed do.</>
)

function Template({
  size,
  withButton,
  expandable,
  title,
  fillLevel,
  onFillLevel,
}: CalloutProps & { withButton: boolean; onFillLevel: FillLevel }) {
  let Wrapper = Div
  let wrapperProps = {}

  if (onFillLevel > 0) {
    Wrapper = Card
    wrapperProps = {
      ...wrapperProps,
      ...{
        fillLevel: onFillLevel,
        padding: 'medium',
      },
    }
  }

  return (
    <Wrapper
      display="flex"
      flexDirection="column"
      gap="large"
      maxWidth={600}
      {...wrapperProps}
    >
      {styles.map(style => (
        <Callout
          severity={style}
          size={size}
          title={title}
          fillLevel={fillLevel}
          buttonProps={withButton ? { children: 'Button text' } : undefined}
          expandable={expandable}
        >
          {size === 'compact' ? compactContent : fullContent}
        </Callout>
      ))}
    </Wrapper>
  )
}

function ExpandableTemplate({ title }: CalloutProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Flex
      flexDirection="column"
      gap="large"
      maxWidth={600}
    >
      {styles.map(style => (
        <Callout
          key={style}
          severity={style}
          title={title}
          buttonProps={{ children: 'Learn more' }}
          expandable
          expanded={expanded}
          onExpand={setExpanded}
        >
          {fullContent}
        </Callout>
      ))}
    </Flex>
  )
}

export const Default = Template.bind({})
Default.args = {
  title: '',
  size: 'full',
  withButton: false,
  onFillLevel: 0,
}

export const WithTitle = Template.bind({})
WithTitle.args = {
  title: 'Title text - How to write a dummy title',
  size: 'full',
  withButton: false,
  onFillLevel: 0,
}

export const Compact = Template.bind({})
Compact.args = {
  title: '',
  size: 'compact',
  withButton: false,
  onFillLevel: 0,
}

export const WithButton = Template.bind({})
WithButton.args = {
  title: '',
  size: 'full',
  withButton: true,
  onFillLevel: 0,
}

export const Expandable = ExpandableTemplate.bind({})
Expandable.args = {
  title: 'Why do I need to authenticate with GitHub/GitLab?',
}

export const KitchenSink = Template.bind({})
KitchenSink.args = {
  title: 'Title text - How to write a dummy title',
  size: 'full',
  withButton: true,
  onFillLevel: 0,
}

export const OnCard = Template.bind({})
OnCard.args = {
  title: 'Title text - How to write a dummy title',
  size: 'full',
  withButton: true,
  onFillLevel: 1,
  expandable: false,
}
