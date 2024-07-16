import { Accordion } from '..'
import { AccordionItem } from '../components/Accordion'

export default {
  title: 'Accordion',
  component: Accordion,
  argTypes: {
    hideDefaultIcon: {
      control: {
        type: 'boolean',
      },
    },
    type: {
      options: ['single', 'multiple'],
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
}

export const Default = Template.bind({})
Default.args = {
  hideDefaultIcon: false,
  type: 'single',
  trigger: 'Title',
  children: 'Children',
}

function Template({ hideDefaultIcon, trigger, children, ...args }: any) {
  return (
    <Accordion {...args}>
      <AccordionItem
        hideDefaultIcon={hideDefaultIcon}
        trigger={trigger}
        value="one"
      >
        {children}
      </AccordionItem>
      <AccordionItem
        hideDefaultIcon={hideDefaultIcon}
        trigger={trigger}
        value="two"
      >
        {children}
      </AccordionItem>
      <AccordionItem
        hideDefaultIcon={hideDefaultIcon}
        trigger={trigger}
        value="three"
      >
        {children}
      </AccordionItem>
    </Accordion>
  )
}
