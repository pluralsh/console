import { useState } from 'react'
import { Div, Flex, Input, P } from 'honorable'

import FormField from '../components/FormField'
import MagnifyingGlassIcon from '../components/icons/MagnifyingGlassIcon'
import CaretDownIcon from '../components/icons/CaretDownIcon'

export default {
  title: 'FormField',
  component: FormField,
}

function Template(args: any) {
  const { valid, error } = args

  return (
    <FormField {...args}>
      <Input
        valid={valid}
        error={error}
      />
    </FormField>
  )
}

const max = 160

function FullTemplate(args: any) {
  const [value, setValue] = useState('')
  const { valid, error, large, small } = args

  return (
    <FormField
      label="Label"
      caption="Action"
      hint={(
        <Flex
          caption
          align="center"
          color="text-light"
        >
          <P
            flexGrow={1}
            color={error ? 'icon-error' : null}
          >
            Hint text
          </P>
          <P ml={0.5}>
            {value.length} / {max}
          </P>
        </Flex>
      )}
      {...args}
    >
      <Input
        value={value}
        onChange={event => event.target.value.length <= max ? setValue(event.target.value) : null}
        valid={valid}
        error={error}
        large={large}
        small={small}
        placeholder="Placeholder text"
        startIcon={<MagnifyingGlassIcon />}
        endIcon={(
          <CaretDownIcon
            size={10}
            mt={0.333}
            mx="3px"
          />
        )}
      />
    </FormField>
  )
}

function Template2(args: any) {
  return (
    <>
      <FullTemplate
        large
        {...args}
      />
      <FullTemplate
        mt={1}
        {...args}
      />
      <FullTemplate
        mt={1}
        small
        {...args}
      />
    </>
  )
}

export const Full = Template2.bind({})

Full.args = {
  error: false,
  valid: false,
}

export const Default = Template.bind({})

Default.args = {
}

export const Label = Template.bind({})

Label.args = {
  label: 'Email',
}

export const Required = Template.bind({})

Required.args = {
  label: 'Email',
  required: true,
}

export const Caption = Template.bind({})

Caption.args = {
  label: 'Password',
  caption: 'At least 8 characters',
}

export const LongCaption = Template.bind({})

LongCaption.args = {
  label: 'Password',
  caption: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
}

export const Valid = Template.bind({})

Valid.args = {
  label: 'Password',
  caption: 'At least 8 characters',
  valid: true,
}

export const Error = Template.bind({})

Error.args = {
  label: 'Password',
  caption: 'At least 8 characters',
  error: true,
}
