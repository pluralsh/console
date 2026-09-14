import { type FormEvent, useState } from 'react'

import styled from 'styled-components'

import { Button, Card, Code, Flex, Flyover, FormField, Input, SearchIcon } from '..'
import { jsCode } from '../constants'
import type { Meta, StoryObj } from '@storybook/react'

const Text = styled.p(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.body2,
}))

const Heading = styled.h3(({ theme }) => ({
  margin: 0,
  marginBottom: 8,
  ...theme.partials.text.subtitle1,
}))

const meta = {
  title: 'Flyover',
  component: Flyover,
  argTypes: {},
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function ExtraContent() {
  return (
    <div style={{ maxWidth: 500 }}>
      <Text style={{ marginBottom: 16 }}>
        Some extra content to check that body scroll is disabled when Flyover is
        open.
      </Text>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text
          key={i}
          style={{ marginBottom: 16 }}
        >
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
        </Text>
      ))}
    </div>
  )
}

function Template(args: any) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Heading>
        {args.header} Flyover
      </Heading>
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
            <Text style={{ marginBottom: 16 }}>
              Uninstalling this application will disable all future upgrades.
            </Text>
            <Text>
              If you&apos;d also like to remove the running instance from your
              cluster, be sure to run `plural destroy` from this
              application&apos;s repository.
            </Text>
          </>
        )}

        {args.asForm && (
          <Flex
            gap="medium"
            direction="column"
          >
            <FormField label="Name">
              <Input value="Admin" />
            </FormField>
            <FormField label="Description">
              <Input value="Full account access" />
            </FormField>
            <FormField label="Repository bindings">
              <Input value="*" />
            </FormField>
            <Text>
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
            </Text>
            <FormField label="Repository bindings">
              <Input startIcon={<SearchIcon />} />
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
      <Heading>
        {args.header} Flyover
      </Heading>
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

export const Default: Story = {
  render: Template,
  args: {
    header: 'Default',
    asForm: false,
    scrollable: true,
  },
}

export const Form: Story = {
  render: Template,
  args: {
    header: 'Form',
    asForm: true,
    scrollable: true,
  },
}

export const NonScrollable: Story = {
  render: NonScrollTemplate,
  args: {
    header: 'Non-scrollable',
    scrollable: false,
  },
}
