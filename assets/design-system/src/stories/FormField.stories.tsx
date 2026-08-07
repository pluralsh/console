import { useState } from 'react'
import { Div } from 'honorable'

import Input from '../components/Input'
import FormField from '../components/FormField'
import MagnifyingGlassIcon from '../components/icons/MagnifyingGlassIcon'
import CaretDownIcon from '../components/icons/CaretDownIcon'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'FormField',
  component: FormField,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  const [value, setValue] = useState('')
  const {
    valid,
    disabled,
    error,
    large,
    small,
    label,
    caption,
    maxLength,
    hint,
    startIcon,
    endIcon,
    multiline,
    minRows,
    maxRows,
    ...restArgs
  } = args

  return (
    <FormField
      label={label}
      caption={caption}
      hint={hint}
      error={error}
      disabled={disabled}
      maxLength={maxLength}
      length={value.length}
      small={small}
      {...restArgs}
    >
      <Input
        value={value}
        onChange={(event) =>
          setValue(event.target.value.substring(0, maxLength))
        }
        valid={valid}
        error={error}
        large={large}
        small={small}
        disabled={disabled}
        placeholder="Placeholder text"
        startIcon={startIcon}
        endIcon={endIcon}
        multiline={multiline}
        minRows={minRows}
        maxRows={maxRows}
      />
    </FormField>
  )
}

function AllSizesTemplate(args: any) {
  return (
    <Div maxWidth="400px">
      <Template
        large
        {...args}
      />
      <Template
        marginTop="medium"
        {...args}
      />
      <Template
        marginTop="medium"
        small
        {...args}
      />
    </Div>
  )
}

export const Full: Story = {
  render: AllSizesTemplate,
  args: {
  label: 'Label',
  caption: 'Action',
  maxLength: 120,
  hint: 'Hint text',
  startIcon: <MagnifyingGlassIcon />,
  endIcon: (
    <CaretDownIcon
      size={10}
      mt={0.333}
      mx="3px"
    />
  ),
},
}

export const FullError: Story = {
  render: AllSizesTemplate,
  args: {
  ...Full.args,
  ...{
    label: 'Password',
    hint: 'Something is wrong',
    error: true,
  },
},
}

export const FullDisabled: Story = {
  render: AllSizesTemplate,
  args: {
  ...Full.args,
  ...{
    disabled: true,
  },
},
}

export const Horizontal: Story = {
  render: Template,
  args: {
    ...Full.args,
    layout: 'horizontal',
  },
}

export const Default: Story = {
  render: AllSizesTemplate,
  args: {},
}

export const Label: Story = {
  render: AllSizesTemplate,
  args: {
    label: 'Email',
  },
}

export const Required: Story = {
  render: AllSizesTemplate,
  args: {
    label: 'Email',
    required: true,
  },
}

export const Caption: Story = {
  render: AllSizesTemplate,
  args: {
    label: 'Password',
    caption: 'A short caption',
  },
}

export const LongCaption: Story = {
  render: AllSizesTemplate,
  args: {
  label: 'Label',
  caption:
    'This will probably truncate, because it is ever so so longer than usual.',
},
}

export const HintText: Story = {
  render: AllSizesTemplate,
  args: {
    label: 'Label',
    hint: 'Some hint text',
  },
}

export const MaxLength: Story = {
  render: AllSizesTemplate,
  args: {
    label: 'Label',
    maxLength: 30,
  },
}

export const ArbitraryHintContent: Story = {
  render: AllSizesTemplate,
  args: {
  label: 'Label',
  hint: (
    <Div
      backgroundColor="fill-one"
      padding="medium"
      width="100%"
      textAlign="center"
      border="1px solid border"
      borderRadius="medium"
    >
      Put whatever you want in the hint!
    </Div>
  ),
},
}

export const Multiline: Story = {
  render: AllSizesTemplate,
  args: {
    label: 'Label',
    multiline: true,
    minRows: 3,
    maxLength: 200,
  },
}

