import { Div, Flex } from 'honorable'

import { type ChangeEvent, useState } from 'react'

import MagnifyingGlassIcon from '../components/icons/MagnifyingGlassIcon'
import BrowseAppsIcon from '../components/icons/BrowseAppsIcon'
import CaretDownIcon from '../components/icons/CaretDownIcon'
import SearchIcon from '../components/icons/SearchIcon'
import Input from '../components/Input'

export default {
  title: 'Input',
  component: Input,
}

function Template(args: any) {
  const [inputVal, setInputVal] = useState('')

  const props = {
    value: inputVal,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setInputVal(e.target.value)
    },
    ...args,
  }

  return (
    <Flex
      direction="column"
      maxWidth="400px"
    >
      <Input {...props} />
      <Div marginTop="medium">
        <Input
          startIcon={<MagnifyingGlassIcon />}
          endIcon={
            <CaretDownIcon
              size={10}
              mt={0.333}
              mx="3px"
            />
          }
          {...props}
        />
      </Div>
    </Flex>
  )
}

function CustomInputTemplate(args: any) {
  const [inputVal, setInputVal] = useState('')

  const props = {
    value: inputVal,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setInputVal(e.target.value)
    },
    ...args,
  }

  return (
    <Flex
      direction="column"
      maxWidth="400px"
    >
      <Div>
        <Input
          large
          width="100%"
          {...props}
        />
      </Div>
      <Div marginTop="medium">
        <Input
          width="100%"
          value={inputVal}
          {...props}
        />
      </Div>
      <Div marginTop="medium">
        <Input
          small
          width="100%"
          value={inputVal}
          {...props}
        />
      </Div>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {}

export const Error = Template.bind({})

Error.args = {
  error: true,
}

export const Placeholder = Template.bind({})

Placeholder.args = {
  placeholder: 'A neat placeholder!',
}

export const Disabled = Template.bind({})

Disabled.args = {
  placeholder: 'Disabled placeholder',
  disabled: true,
}

export const PrefixSuffix = CustomInputTemplate.bind({})

PrefixSuffix.args = {
  prefix: 'app.',
  suffix: '.plural.sh',
}

export const Multiline = CustomInputTemplate.bind({})

Multiline.args = {
  multiline: true,
  minRows: 3,
}

export const TitleContent = CustomInputTemplate.bind({})

TitleContent.args = {
  startIcon: <SearchIcon />,
  titleContent: (
    <>
      <BrowseAppsIcon marginRight="small" />
      Marketplace
    </>
  ),
  placeholder: 'Search the marketplace',
  showClearButton: true,
  suffix: '',
}
