import { Button, H3, P } from 'honorable'
import { useState } from 'react'

import { FormField, Input, Modal } from '..'
import { SEVERITIES } from '../components/Modal'

export default {
  title: 'Modal',
  component: Modal,
  argTypes: {
    size: {
      options: ['medium', 'large'],
      control: {
        type: 'select',
      },
    },
    severity: {
      options: [undefined, ...SEVERITIES],
      control: {
        type: 'select',
      },
    },
  },
}

function Template(args: any) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <H3 marginBottom={8}>{args.header} Modal</H3>
      <Button onClick={() => setOpen(true)}>
        Open
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        actions={args.hasActions && (
          <>
            <Button
              secondary
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              primary
              destructive={!args.form}
              marginLeft="medium"
            >
              {args.form ? 'Save' : 'Uninstall'}
            </Button>
          </>
        )}
        {...args}
      >

        {!args.form && (
          <>
            <P marginBottom={16}>Uninstalling this application will disable all future upgrades.</P>
            <P>If you'd also like to remove the running instance from your cluster, be sure to run
              `plural destroy` from this application's repository.
            </P>
          </>
        )}

        {args.form && (
          <>
            <FormField
              marginBottom="medium"
              label="Name"
            >
              <Input value="Admin" />
            </FormField>

            <FormField
              marginBottom="medium"
              label="Description"
            >
              <Input value="Full account access" />
            </FormField>

            <FormField
              marginBottom="medium"
              label="Repository bindings"
            >
              <Input value="*" />
            </FormField>
            <P>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Phasellus tempor, mi pulvinar vestibulum viverra, magnan ipsum
              suscipit turpis, molestie imperdiet nisi lorem id erat.
              Vestibulum pellentesque vel odio et consequat. Sed lacinia leo
              sit amet velit consequat lobortis. Vivamus facilisis sagittis
              est vel pellentesque. Sed quis ipsum ullamcorper, posuere ipsum
              a, tincidunt tellus. Cras tortor purus, dictum sit amet facilisis
              vitae, commodo vitae elit. Duis a diam blandit, hendrerit velit
              non, tincidunt turpis. Ut at lectus ornare, volutpat elit
              interdum, placerat dolor. Pellentesque et semper massa. Aliquam
              nec nisl eu nibh fringilla vehicula. Suspendisse a purus quam.
            </P>
          </>
        )}
      </Modal>
    </>
  )
}

function PinnedToTopTemplate(args: any) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <H3 marginBottom={8}>{args.header} Modal</H3>
      <Button onClick={() => setOpen(true)}>
        Open
      </Button>
      <Modal
        BackdropProps={{
          justifyContent: 'flex-start',
          paddingTop: 128,
        }}
        open={open}
        onClose={() => setOpen(false)}
        actions={args.hasActions && (
          <>
            <Button
              secondary
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              primary
              destructive={!args.form}
              marginLeft="medium"
            >
              {args.form ? 'Save' : 'Uninstall'}
            </Button>
          </>
        )}
        {...args}
      >

        {!args.form && (
          <>
            <P marginBottom={16}>Uninstalling this application will disable all future upgrades.</P>
            <P>If you'd also like to remove the running instance from your cluster, be sure to run
              `plural destroy` from this application's repository.
            </P>
          </>
        )}

        {args.form && (
          <>
            <FormField
              marginBottom="medium"
              label="Name"
            >
              <Input value="Admin" />
            </FormField>

            <FormField
              marginBottom="medium"
              label="Description"
            >
              <Input value="Full account access" />
            </FormField>

            <FormField
              marginBottom="medium"
              label="Repository bindings"
            >
              <Input value="*" />
            </FormField>
            <P>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Phasellus tempor, mi pulvinar vestibulum viverra, magnan ipsum
              suscipit turpis, molestie imperdiet nisi lorem id erat.
              Vestibulum pellentesque vel odio et consequat. Sed lacinia leo
              sit amet velit consequat lobortis. Vivamus facilisis sagittis
              est vel pellentesque. Sed quis ipsum ullamcorper, posuere ipsum
              a, tincidunt tellus. Cras tortor purus, dictum sit amet facilisis
              vitae, commodo vitae elit. Duis a diam blandit, hendrerit velit
              non, tincidunt turpis. Ut at lectus ornare, volutpat elit
              interdum, placerat dolor. Pellentesque et semper massa. Aliquam
              nec nisl eu nibh fringilla vehicula. Suspendisse a purus quam.
            </P>
          </>
        )}
      </Modal>
    </>
  )
}

export const Default = Template.bind({})

Default.args = {
  header: 'Default',
  title: 'Confirm Uninstall',
  form: false,
  size: 'medium',
  hasActions: true,
}

export const Form = Template.bind({})

Form.args = {
  header: 'Form',
  title: 'Access Policy',
  form: true,
  hasActions: true,
}

export const PinnedToTop = PinnedToTopTemplate.bind({})

Default.args = {
  header: 'Default',
  title: 'Confirm Uninstall',
  form: false,
  size: 'medium',
  hasActions: true,
}
