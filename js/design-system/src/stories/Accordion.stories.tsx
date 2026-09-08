import { Accordion } from '..'
import { AccordionItem } from '../components/Accordion'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Accordion',
  component: Accordion,
  argTypes: {
    type: {
      options: ['single', 'multiple'],
      control: {
        type: 'select',
      },
    },
    padding: {
      options: ['none', 'compact', 'relaxed'],
      control: {
        type: 'select',
      },
    },
    paddingArea: {
      options: ['all', 'trigger-only'],
      control: {
        type: 'select',
      },
    },
    caret: {
      options: ['none', 'left', 'right'],
      control: {
        type: 'select',
      },
    },
    orientation: {
      options: ['vertical', 'horizontal'],
      control: {
        type: 'select',
      },
    },
  },
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

export const Default: Story = {
  render: Template,
  args: {
    type: 'single',
    padding: 'relaxed',
    paddingArea: 'all',
    caret: 'right',
    trigger: 'Title',
    children: 'Children',
  },
}

function Template({
  padding,
  paddingArea,
  caret,
  trigger,
  children,
  ...args
}: any) {
  return (
    <Accordion {...args}>
      <AccordionItem
        trigger={trigger}
        caret={caret}
        padding={padding}
        paddingArea={paddingArea}
        value="one"
      >
        {children}
      </AccordionItem>
      <AccordionItem
        trigger={trigger}
        caret={caret}
        padding={padding}
        paddingArea={paddingArea}
        value="two"
      >
        {children}
      </AccordionItem>
      <AccordionItem
        trigger={trigger}
        caret={caret}
        padding={padding}
        paddingArea={paddingArea}
        value="three"
      >
        {children}
      </AccordionItem>
    </Accordion>
  )
}
