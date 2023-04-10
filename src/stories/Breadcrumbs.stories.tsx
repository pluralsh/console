import { Flex, Span } from 'honorable'

import { useState } from 'react'

import {
  Breadcrumb,
  BreadcrumbsProvider,
  useSetBreadcrumbs,
} from '../components/contexts/BreadcrumbsContext'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Select } from '../components/Select'
import { ListBoxItem } from '../components/ListBoxItem'
import FormField from '../components/FormField'

import { NavContextProviderStub } from './NavigationContextStub'

export default {
  title: 'Breadcrumbs',
  component: 'Breadcrumbs',
  argTypes: {
    maxLength: {},
  },
}

const crumbList: Breadcrumb[] = [
  {
    url: 'http://stuff.com/link1',
    label: 'Root level',
  },
  {
    url: 'http://stuff.com/link1/link2',
    label: <Span>Level 2</Span>,
    textValue: 'Level 2',
  },
  {
    url: 'http://stuff.com/link1/link2/link3',
    label: 'Another',
  },
  {
    url: 'http://stuff.com/link1/link2/link3/link4',
    label: (
      <>
        Yet <i>another</i> level
      </>
    ),
    textValue: 'Yet another level',
  },
  {
    url: 'http://stuff.com/link1/link2/link3/link4/link5',
    label: 'Are well still going?',
  },
  {
    url: 'http://stuff.com/link1/link2/link3/link4/link5',
    label: (
      <>
        You <b>bet</b> we are!
      </>
    ),
    textValue: 'You bet we are',
  },
  {
    url: 'http://stuff.com/link1/link2/link3/link4/link5/link6',
    label: 'This is getting out of hand',
  },
]

const crumbLists = crumbList.map((_, i) => crumbList.slice(0, i + 1))

function CrumbSetter() {
  const [selectedList, setSelectedList] = useState<string>(
    (crumbLists.length - 1).toString()
  )

  useSetBreadcrumbs(crumbLists[selectedList])

  return (
    <FormField label="Select a page">
      <Select
        label="..."
        selectedKey={selectedList}
        onSelectionChange={(key) => setSelectedList(key as string)}
      >
        {crumbLists.map((crumbs, i) => {
          const lastCrumb = crumbs[crumbs.length - 1]

          return (
            <ListBoxItem
              key={i.toString()}
              textValue={lastCrumb.textValue}
              label={lastCrumb.label}
            />
          )
        })}
      </Select>
    </FormField>
  )
}

function Template(args: any) {
  return (
    <NavContextProviderStub>
      <BreadcrumbsProvider>
        <Flex
          flexDirection="column"
          gap="large"
        >
          {/* SINGLE SELECT */}
          <Breadcrumbs
            {...args}
            marginBottom="xlarge"
          />
          <CrumbSetter />
        </Flex>
      </BreadcrumbsProvider>
    </NavContextProviderStub>
  )
}

export const Default = Template.bind({})

Default.args = {
  minLength: undefined,
  maxLength: undefined,
  collapsible: true,
}
