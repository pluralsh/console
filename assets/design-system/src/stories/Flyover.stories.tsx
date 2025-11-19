import { Div, Flex, H3, P } from 'honorable'
import { type FormEvent, useState } from 'react'

import styled from 'styled-components'

import { Button, Card, Code, Flyover, FormField, Input2, SearchIcon } from '..'
import { jsCode } from '../constants'

export default {
  title: 'Flyover',
  component: Flyover,
  argTypes: {},
}

function ExtraContent() {
  return (
    <Div maxWidth={500}>
      <P marginBottom="medium">
        Some extra content to check that body scroll is disabled when Flyover is
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
      <H3 marginBottom={8}>{args.header} Flyover</H3>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Flyover
        open={open}
        onClose={() => setOpen(false)}
        asForm={!!args.asForm}
        formProps={{
          onSubmit: (e: FormEvent) => {
            e.preventDefault()
            alert('Form submitted')
          },
        }}
        {...args}
      >
        {!args.asForm && (
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

        {args.asForm && (
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
      </Flyover>
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
      <H3 marginBottom={8}>{args.header} Flyover</H3>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Flyover
        open={open}
        onClose={() => setOpen(false)}
        {...args}
      >
        <NonScrollCode language="js">{jsCode}</NonScrollCode>
      </Flyover>
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
  asForm: false,
  scrollable: true,
}

export const Form = Template.bind({})

Form.args = {
  header: 'Form',
  asForm: true,
  scrollable: true,
}

export const NonScrollable = NonScrollTemplate.bind({})

NonScrollable.args = {
  header: 'Non-scrollable',
  scrollable: false,
}
