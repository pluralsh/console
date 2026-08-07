import { Div, Flex } from 'honorable'

import { type ChangeEvent, useState } from 'react'

import MagnifyingGlassIcon from '../components/icons/MagnifyingGlassIcon'
import BrowseAppsIcon from '../components/icons/BrowseAppsIcon'
import CaretDownIcon from '../components/icons/CaretDownIcon'
import SearchIcon from '../components/icons/SearchIcon'
import Input from '../components/Input'
import Input2 from '../components/Input2'
import { Card } from '../index'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Input',
  component: Input,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function InputSet(props: any) {
  return (
    <Flex
      direction="column"
      maxWidth="500px"
      gap="large"
    >
      <Input {...props} />
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
    </Flex>
  )
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
      maxWidth="500px"
      gap="large"
    >
      <InputSet
        {...props}
        large
      />
      <InputSet {...props} />
      <InputSet
        {...props}
        small
      />
      <Card padding="large">
        <InputSet {...props} />
      </Card>
      <Card
        fillLevel={2}
        padding="large"
      >
        <InputSet {...props} />
      </Card>
      <Card
        fillLevel={3}
        padding="large"
      >
        <InputSet {...props} />
      </Card>
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
      maxWidth="500px"
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

function CustomInputV2Template(args: any) {
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
      maxWidth="500px"
    >
      <Div marginTop="medium">
        <Input2
          size="large"
          width="100%"
          {...props}
        />
      </Div>
      <Div marginTop="medium">
        <Input2
          width="100%"
          value={inputVal}
          {...props}
        />
      </Div>
      <Div marginTop="medium">
        <Input2
          size="small"
          width="100%"
          value={inputVal}
          {...props}
        />
      </Div>
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
  args: {},
}

export const Error: Story = {
  render: Template,
  args: {
    error: true,
  },
}

export const Placeholder: Story = {
  render: Template,
  args: {
    placeholder: 'A neat placeholder!',
  },
}

export const Disabled: Story = {
  render: Template,
  args: {
    placeholder: 'Disabled placeholder',
    disabled: true,
  },
}

export const PrefixSuffix: Story = {
  render: CustomInputTemplate,
  args: {
    prefix: 'app.',
    suffix: '.plural.sh',
  },
}

export const Multiline: Story = {
  render: CustomInputTemplate,
  args: {
    multiline: true,
    minRows: 3,
  },
}

export const TitleContent: Story = {
  render: CustomInputTemplate,
  args: {
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
  },
}

export const Version2: Story = {
  render: CustomInputV2Template,
  args: {
    startIcon: <SearchIcon />,
    // endIcon: <TagIcon />,
    titleContent: (
      <>
        <BrowseAppsIcon marginRight="small" />
        Marketplace
      </>
    ),
    placeholder: 'Search the marketplace',
    showClearButton: true,
    suffix: '',
    prefix: '',
    disabled: false,
    error: false,
  },
}
