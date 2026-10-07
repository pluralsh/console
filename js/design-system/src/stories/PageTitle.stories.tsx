import { useTheme } from 'styled-components'

import { Button, Flex } from '..'
import PageTitle, { type PageTitleProps } from '../components/PageTitle'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Page Title',
  component: PageTitle,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template({ heading, ...props }: PageTitleProps) {
  const theme = useTheme()

  return (
    <div>
      <PageTitle
        heading={heading}
        {...props}
      />
      <p css={{ margin: 0, ...theme.partials.text.body2 }}>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Animi quasi
        beatae sed est vitae, autem voluptatum ducimus ipsa accusantium, qui
        illo repellat earum placeat nesciunt in accusamus deserunt. Odio,
        excepturi!
      </p>
    </div>
  )
}

function UnsavedHint() {
  const theme = useTheme()

  return (
    <Flex justify="flex-end">
      <p
        css={{
          margin: 0,
          marginRight: 16,
          textAlign: 'right',
          alignSelf: 'center',
          ...theme.partials.text.body2,
          color: theme.colors['text-xlight'],
        }}
      >
        Unsaved changes
      </p>
      <Button>Save</Button>
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    heading: 'Page Title',
  },
}

export const WithContent: Story = {
  render: Template,
  args: {
    heading: (
      <div>
        <strong>Customized</strong> <em>page</em> title
      </div>
    ),
    children: <UnsavedHint />,
  },
}
