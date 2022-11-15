import { Div, Flex, H1 } from 'honorable'
import { Key, useRef, useState } from 'react'

import {
  SubTab,
  TabList,
  TabListStateProps,
  TabPanel,
} from '..'

export default {
  title: 'ButtonGroup',
  component: SubTab,
  argTypes: {
    size: {
      options: ['small', 'medium'],
      control: {
        type: 'select',
      },
    },
  },
}

const tabs = {
  lions: {
    label: 'Lions',
    content:
      "The lion (Panthera leo) is a large cat of the genus Panthera native to Africa and India. It has a muscular, broad-chested body, short, rounded head, round ears, and a hairy tuft at the end of its tail. It is sexually dimorphic; adult male lions are larger than females and have a prominent mane. It is a social species, forming groups called prides. A lion's pride consists of a few adult males, related females, and cubs. Groups of female lions usually hunt together, preying mostly on large ungulates. The lion is an apex and keystone predator; although some lions scavenge when opportunities occur and have been known to hunt humans, the species typically does not actively seek out and prey on humans.",
  },
  tigers: {
    label: 'Tigers',
    content:
      "The tiger (Panthera tigris) is the largest living cat species and a member of the genus Panthera. It is most recognisable for its dark vertical stripes on orange fur with a white underside. An apex predator, it primarily preys on ungulates such as deer and wild boar. It is territorial and generally a solitary but social predator, requiring large contiguous areas of habitat, which support its requirements for prey and rearing of its offspring. Tiger cubs stay with their mother for about two years, then become independent and leave their mother's home range to establish their own.",
  },
  bears: {
    label: 'Bears',
    content:
      'Bears are carnivoran mammals of the family Ursidae. They are classified as caniforms, or doglike carnivorans. Although only eight species of bears are extant, they are widespread, appearing in a wide variety of habitats throughout the Northern Hemisphere and partially in the Southern Hemisphere. Bears are found on the continents of North America, South America, Europe, and Asia. Common characteristics of modern bears include large bodies with stocky legs, long snouts, small rounded ears, shaggy hair, plantigrade paws with five nonretractile claws, and short tails.',
  },
  ohmy: {
    label: 'Oh my!',
    content:
      'George Takei (Japanese: ジョージ・タケイ, born Hosato Takei (武井 穂郷); April 20, 1937) is an American actor, author, and activist. He is internationally known for his role as Hikaru Sulu, helmsman of the fictional starship USS Enterprise in the television series Star Trek and subsequent films.[1][2]',
  },
}

function TemplateBasic(args: any) {
  const tabStateRef = useRef()
  const [selectedKey, setSelectedKey] = useState<Key>('1')
  const orientation = 'horizontal'
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation,
    selectedKey,
    onSelectionChange: setSelectedKey,
  }

  return (
    <Div>
      <Flex
        flexDirection="column"
        maxWidth={800}
      >
        <TabList
          stateRef={tabStateRef}
          stateProps={tabListStateProps}
          flexShrink={0}
          marginRight={0}
          marginBottom="xlarge"
          width="100%"
        >
          {Object.entries(tabs).map(([key, tab]) => (
            <SubTab
              key={key}
              textValue={tab.label}
              {...args}
            >
              {tab.label}
            </SubTab>
          ))}
        </TabList>
        {
          Object.entries(tabs).map(([key, tab]) => (
            <TabPanel
              key={key}
              tabKey={key}
              mode="multipanel"
              stateRef={tabStateRef}
              paddingTop="large"
              paddingBottom="large"
              borderTop="1px solid border"
              borderBottom="1px solid border"
            >
              <H1
                title1
                marginBottom="medium"
              >
                {tab?.label}
              </H1>
              {tab?.content}
            </TabPanel>
          ))

        }
      </Flex>
    </Div>
  )
}

export const Default = TemplateBasic.bind({})
Default.args = {
  size: 'small',
}
