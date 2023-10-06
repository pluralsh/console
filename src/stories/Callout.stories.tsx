import { Div, Flex } from 'honorable'

import { useState } from 'react'

import { type FillLevel } from '../components/contexts/FillLevelContext'
import { Button, Callout, type CalloutProps, Card } from '..'

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
    controlled: {
      control: { type: 'boolean' },
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
    tempor <a href="">incididunt ut labore</a> et dolore magna aliqua. Ut enim
    ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
    ex ea commodo consequat.
  </>
)

const compactContent = (
  <>
    Lorem ipsum dolor sit amet, consectetur <a href="">adipiscing elit</a>, sed
    do.
  </>
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
      {styles.map((style) => (
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

function ExpandableTemplate({
  title,
  controlled = false,
}: CalloutProps & { controlled?: boolean }) {
  const [expanded, setExpanded] = useState(styles.map(() => false))

  return (
    <Flex
      flexDirection="column"
      gap="large"
      maxWidth={600}
    >
      {styles.map((style, i) => (
        <Callout
          key={style}
          severity={style}
          title={title}
          buttonProps={{ children: 'Learn more', as: 'a' }}
          expandable
          defaultExpanded
          expanded={controlled ? expanded[i] : undefined}
          onExpand={
            controlled
              ? (val) => {
                  console.info('Controlled expanded:', val)
                  const next = [...expanded]

                  next[i] = val
                  setExpanded(next)
                }
              : (val) => {
                  console.info('Uncontrolled expanded:', val)
                }
          }
        >
          {fullContent}
        </Callout>
      ))}
    </Flex>
  )
}

function CloseableTemplate({ title }: CalloutProps) {
  const [closed, setClosed] = useState(false)

  return (
    <Flex
      flexDirection="column"
      gap="large"
      maxWidth={600}
    >
      {styles.map((style) => (
        <Callout
          key={style}
          severity={style}
          title={title}
          buttonProps={{ children: 'Learn more', as: 'a' }}
          closeable
          closed={closed}
          onClose={setClosed}
        >
          {fullContent}
        </Callout>
      ))}
      {closed && (
        <Button
          secondary
          onClick={() => setClosed(false)}
        >
          Reset
        </Button>
      )}
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
  controlled: 'false',
}

export const Closeable = CloseableTemplate.bind({})
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
