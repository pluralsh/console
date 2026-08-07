import { Flex } from 'honorable'
import { useState } from 'react'

import ErrorIcon from '../components/icons/ErrorIcon'

import Tab from '../components/Tab'
import SubTab from '../components/SubTab'
import Card from '../components/Card'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Tab',
  component: Tab,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  const [active, setActive] = useState(0)

  return (
    <>
      <Flex>
        <Tab
          active={active === 0}
          onClick={() => setActive(0)}
          {...args}
        >
          Active tab
        </Tab>
        <Tab
          active={active === 1}
          onClick={() => setActive(1)}
          {...args}
        >
          Inactive tab
        </Tab>
        <Tab
          active={active === 2}
          onClick={() => setActive(2)}
          {...args}
        >
          Inactive tab
        </Tab>
      </Flex>
      <Flex marginTop="xlarge">
        <Tab
          startIcon={<ErrorIcon />}
          active={active === 0}
          onClick={() => setActive(0)}
          {...args}
        >
          Active tab
        </Tab>
        <Tab
          startIcon={<ErrorIcon />}
          active={active === 1}
          onClick={() => setActive(1)}
          {...args}
        >
          Inactive tab
        </Tab>
        <Tab
          startIcon={<ErrorIcon />}
          active={active === 2}
          onClick={() => setActive(2)}
          {...args}
        >
          Inactive tab
        </Tab>
      </Flex>
    </>
  )
}

export const Default: Story = {
  render: Template,
  args: {},
}

function Template2(args: any) {
  const [active, setActive] = useState(0)

  return (
    <>
      <Flex
        direction="column"
        width={256 - 64}
      >
        <Tab
          active={active === 0}
          onClick={() => setActive(0)}
          {...args}
        >
          Active tab
        </Tab>
        <Tab
          active={active === 1}
          onClick={() => setActive(1)}
          {...args}
        >
          Inactive tab
        </Tab>
        <Tab
          active={active === 2}
          onClick={() => setActive(2)}
          {...args}
        >
          Inactive tab
        </Tab>
      </Flex>
      <Flex
        marginTop="xlarge"
        direction="column"
        width={256 - 64}
      >
        <Tab
          startIcon={<ErrorIcon />}
          active={active === 0}
          onClick={() => setActive(0)}
          {...args}
        >
          Active tab
        </Tab>
        <Tab
          startIcon={<ErrorIcon />}
          active={active === 1}
          onClick={() => setActive(1)}
          {...args}
        >
          Inactive tab
        </Tab>
        <Tab
          startIcon={<ErrorIcon />}
          active={active === 2}
          onClick={() => setActive(2)}
          {...args}
        >
          Inactive tab
        </Tab>
      </Flex>
    </>
  )
}

export const Vertical: Story = {
  render: Template2,
  args: {
    vertical: true,
  },
}

function SubTabs(args: any) {
  const [active, setActive] = useState(0)

  return (
    <Flex gap="xxsmall">
      <SubTab
        active={active === 0}
        onClick={() => setActive(0)}
        {...args}
      >
        Active tab
      </SubTab>
      <SubTab
        active={active === 1}
        onClick={() => setActive(1)}
        {...args}
      >
        Inactive tab
      </SubTab>
      <SubTab
        active={active === 2}
        onClick={() => setActive(2)}
        {...args}
      >
        Inactive tab
      </SubTab>
    </Flex>
  )
}

function SubTabTemplate(args: any) {
  return (
    <Flex
      direction="column"
      gap="large"
    >
      <SubTabs {...args} />
      <Card style={contentCardStyle}>
        <SubTabs {...args} />
      </Card>
      <Card style={contentCardStyle}>
        <SubTabs {...args} />
      </Card>
      <Card style={contentCardStyle}>
        <SubTabs {...args} />
      </Card>
    </Flex>
  )
}
const contentCardStyle = {
  padding: 32,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
}

export const Subtab: Story = {
  render: SubTabTemplate,
  args: {
    disabled: false,
  },
}

