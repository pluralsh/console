import {
  Button, H3, P,
} from 'honorable'
import { useState } from 'react'

import {
  FormField, Input, Modal, ModalActions, ModalHeader,
} from '..'

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
        {...args}
      >
        <ModalHeader>
          {args.title}
        </ModalHeader>

        {!args.form && (
          <>
            <P marginBottom={16}>Uninstalling this application will disable all future upgrades.</P>
            <P>If you'd also like to remove the running instance from your cluster, be sure to run
              `plural destroy` from this application's repository.
            </P>
            <ModalActions>
              <Button
                secondary
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                destructive
                marginLeft="medium"
                onClick={() => setOpen(false)}
              >
                Uninstall
              </Button>
            </ModalActions>
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
            <ModalActions>
              <Button
                secondary
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                primary
                marginLeft="medium"
              >
                Save
              </Button>
            </ModalActions>
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
}

export const Form = Template.bind({})

Form.args = {
  header: 'Form',
  title: 'Access Policy',
  form: true,
}
