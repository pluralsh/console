/* eslint-disable @typescript-eslint/no-explicit-any */
import { Flex } from 'honorable'
import { useState } from 'react'

import ErrorIcon from '../components/icons/ErrorIcon'

import Tab from '../components/Tab'

export default {
  title: 'Tab',
  component: Tab,
}

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

export const Default = Template.bind({})

Default.args = {
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

export const Vertical = Template2.bind({})

Vertical.args = {
  vertical: true,
}
