import { Div, Flex } from 'honorable'

import { useState } from 'react'

import { type FillLevel } from '../components/contexts/FillLevelContext'
import { Button, Callout, type CalloutProps, Card } from '..'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
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
} satisfies Meta<any>

export default meta
const styles: CalloutProps['severity'][] = [
  'info',
  'neutral',
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
  noContent,
}: CalloutProps & {
  withButton: boolean
  noContent?: boolean
  onFillLevel: FillLevel
}) {
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
          {noContent
            ? undefined
            : size === 'compact'
              ? compactContent
              : fullContent}
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

export const Default: StoryObj<Parameters<typeof Template>[0]> = {
  render: Template,
  args: {
    title: '',
    size: 'full',
    withButton: false,
    onFillLevel: 0,
  },
}

export const WithTitle: StoryObj<Parameters<typeof Template>[0]> = {
  render: Template,
  args: {
    title: 'Title text - How to write a dummy title',
    size: 'full',
    withButton: false,
    onFillLevel: 0,
  },
}

export const OnlyTitle: StoryObj<Parameters<typeof Template>[0]> = {
  render: Template,
  args: {
    title: 'Title text - How to write a dummy title',
    size: 'full',
    noContent: true,
    withButton: false,
    onFillLevel: 0,
  },
}

export const Compact: StoryObj<Parameters<typeof Template>[0]> = {
  render: Template,
  args: {
    title: '',
    size: 'compact',
    withButton: false,
    onFillLevel: 0,
  },
}

export const WithButton: StoryObj<Parameters<typeof Template>[0]> = {
  render: Template,
  args: {
    title: '',
    size: 'full',
    withButton: true,
    onFillLevel: 0,
  },
}

export const Expandable: StoryObj<Parameters<typeof ExpandableTemplate>[0]> = {
  render: ExpandableTemplate,
  args: {
    title: 'Why do I need to authenticate with GitHub/GitLab?',
    controlled: false,
  },
}

export const Closeable: StoryObj<Parameters<typeof CloseableTemplate>[0]> = {
  render: CloseableTemplate,
  args: {
    title: 'Why do I need to authenticate with GitHub/GitLab?',
  },
}

export const KitchenSink: StoryObj<Parameters<typeof Template>[0]> = {
  render: Template,
  args: {
    title: 'Title text - How to write a dummy title',
    size: 'full',
    withButton: true,
    onFillLevel: 0,
  },
}

export const OnCard: StoryObj<Parameters<typeof Template>[0]> = {
  render: Template,
  args: {
    title: 'Title text - How to write a dummy title',
    size: 'full',
    withButton: true,
    onFillLevel: 1,
    expandable: false,
  },
}
