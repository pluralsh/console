import { Button, Div, Flex, P } from 'honorable'

import PageTitle, { type PageTitleProps } from '../components/PageTitle'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Page Title',
  component: PageTitle,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template({ heading, ...props }: PageTitleProps) {
  return (
    <Div>
      <PageTitle
        heading={heading}
        {...props}
      />
      <P body2>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Animi quasi
        beatae sed est vitae, autem voluptatum ducimus ipsa accusantium, qui
        illo repellat earum placeat nesciunt in accusamus deserunt. Odio,
        excepturi!
      </P>
    </Div>
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
    <Div>
      <strong>Customized</strong> <em>page</em> title
    </Div>
  ),
  children: (
    <Flex justifyContent="flex-end">
      <Flex
        marginRight="medium"
        alignItems="center"
        textAlign="right"
        body2
        color="text-xlight"
      >
        Unsaved changes
      </Flex>
      <Button>Save</Button>
    </Flex>
  ),
},
}

