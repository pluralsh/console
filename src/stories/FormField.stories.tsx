import { useState } from 'react'
import { Div, Input } from 'honorable'

import FormField from '../components/FormField'
import MagnifyingGlassIcon from '../components/icons/MagnifyingGlassIcon'
import CaretDownIcon from '../components/icons/CaretDownIcon'

export default {
  title: 'FormField',
  component: FormField,
}

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

export const Full = AllSizesTemplate.bind({})

Full.args = {
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
}

export const FullError = AllSizesTemplate.bind({})

FullError.args = {
  ...Full.args,
  ...{
    label: 'Password',
    hint: 'Something is wrong',
    error: true,
  },
}

export const FullDisabled = AllSizesTemplate.bind({})

FullDisabled.args = {
  ...Full.args,
  ...{
    disabled: true,
  },
}

export const Default = AllSizesTemplate.bind({})

Default.args = {}

export const Label = AllSizesTemplate.bind({})

Label.args = {
  label: 'Email',
}

export const Required = AllSizesTemplate.bind({})

Required.args = {
  label: 'Email',
  required: true,
}

export const Caption = AllSizesTemplate.bind({})

Caption.args = {
  label: 'Password',
}

export const LongCaption = AllSizesTemplate.bind({})

LongCaption.args = {
  label: 'Label',
}

export const HintText = AllSizesTemplate.bind({})

HintText.args = {
  label: 'Label',
  hint: 'Some hint text',
}

export const MaxLength = AllSizesTemplate.bind({})

MaxLength.args = {
  label: 'Label',
  maxLength: 30,
}

export const ArbitraryHintContent = AllSizesTemplate.bind({})

ArbitraryHintContent.args = {
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
}

export const Multiline = AllSizesTemplate.bind({})

Multiline.args = {
  label: 'Label',
  multiline: true,
  minRows: 3,
  maxLength: 200,
}
