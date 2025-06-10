import { Div, Flex, H3, P } from 'honorable'
import { useState } from 'react'

import styled from 'styled-components'

import { Button, Card, Code, FormField, Input2, Modal, SearchIcon } from '..'
import { SEVERITIES } from '../components/Modal'
import { jsCode } from '../constants'

export default {
  title: 'Modal',
  component: Modal,
  args: {
    scrollable: true,
  },
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

function ExtraContent() {
  return (
    <Div maxWidth={500}>
      <P marginBottom="medium">
        Some extra content to check that body scroll is disabled when Modal is
        open.
      </P>
      {Array.from({ length: 5 }).map(() => (
        <P marginBottom="medium">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus
          tempor, mi pulvinar vestibulum viverra, magnan ipsum suscipit turpis,
          molestie imperdiet nisi lorem id erat. Vestibulum pellentesque vel
          odio et consequat. Sed lacinia leo sit amet velit consequat lobortis.
          Vivamus facilisis sagittis est vel pellentesque. Sed quis ipsum
          ullamcorper, posuere ipsum a, tincidunt tellus. Cras tortor purus,
          dictum sit amet facilisis vitae, commodo vitae elit. Duis a diam
          blandit, hendrerit velit non, tincidunt turpis. Ut at lectus ornare,
          volutpat elit interdum, placerat dolor. Pellentesque et semper massa.
          Aliquam nec nisl eu nibh fringilla vehicula. Suspendisse a purus quam.
        </P>
      ))}
    </Div>
  )
}

function Template(args: any) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <H3 marginBottom={8}>{args.header} Modal</H3>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        actions={
          args.hasActions && (
            <>
              <Button
                secondary
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                destructive={!args.form}
                marginLeft="medium"
              >
                {args.form ? 'Save' : 'Uninstall'}
              </Button>
            </>
          )
        }
        asForm={!!args.form}
        formProps={{
          onSubmit: (e) => {
            e.preventDefault()
            alert('Form submitted')
          },
        }}
        {...args}
      >
        {!args.form && (
          <>
            <P marginBottom={16}>
              Uninstalling this application will disable all future upgrades.
            </P>
            <P>
              If you'd also like to remove the running instance from your
              cluster, be sure to run `plural destroy` from this application's
              repository.
            </P>
          </>
        )}

        {args.form && (
          <Flex
            gap="medium"
            direction="column"
          >
            <FormField label="Name">
              <Input2 value="Admin" />
            </FormField>
            <FormField label="Description">
              <Input2 value="Full account access" />
            </FormField>
            <FormField label="Repository bindings">
              <Input2 value="*" />
            </FormField>
            <P>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus
              tempor, mi pulvinar vestibulum viverra, magnan ipsum suscipit
              turpis, molestie imperdiet nisi lorem id erat. Vestibulum
              pellentesque vel odio et consequat. Sed lacinia leo sit amet velit
              consequat lobortis. Vivamus facilisis sagittis est vel
              pellentesque. Sed quis ipsum ullamcorper, posuere ipsum a,
              tincidunt tellus. Cras tortor purus, dictum sit amet facilisis
              vitae, commodo vitae elit. Duis a diam blandit, hendrerit velit
              non, tincidunt turpis. Ut at lectus ornare, volutpat elit
              interdum, placerat dolor. Pellentesque et semper massa. Aliquam
              nec nisl eu nibh fringilla vehicula. Suspendisse a purus quam.
            </P>
            <FormField label="Repository bindings">
              <Input2 startIcon={<SearchIcon />} />
            </FormField>
          </Flex>
        )}
      </Modal>
      <Card
        marginTop="xlarge"
        width="100%"
        padding="medium"
      >
        <ExtraContent />
      </Card>
    </>
  )
}

const NonScrollCode = styled(Code)((_) => ({
  overflow: 'hidden',
}))

function NonScrollTemplate(args: any) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <H3 marginBottom={8}>{args.header} Modal</H3>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        actions={
          args.hasActions && (
            <Button
              secondary
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          )
        }
        {...args}
      >
        <NonScrollCode language="js">{jsCode}</NonScrollCode>
      </Modal>
      <Card
        marginTop="xlarge"
        width="100%"
        padding="medium"
      >
        <ExtraContent />
      </Card>
    </>
  )
}

export const Default = Template.bind({})

Default.args = {
  header: 'Default',
  form: false,
  size: 'medium',
  hasActions: true,
}

export const Form = Template.bind({})

Form.args = {
  header: 'Form',
  form: true,
  hasActions: true,
}

export const NonScrollable = NonScrollTemplate.bind({})

NonScrollable.args = {
  header: 'Non-scrollable',
  size: 'large',
  scrollable: false,
  hasActions: true,
}
