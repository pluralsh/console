import { Button, Div, Flex, H1 } from 'honorable'
import { Key, useState } from 'react'
import { useTabListState } from '@react-stately/tabs'

import {
  TabList,
  TabListItem,
  TabListStateProps,
  TabPanel,
} from '../components/TabList'

export default {
  title: 'Tab List',
  component: TabList,
}

const tabs = {
  lions: {
    key: '1',
    label: 'Lions',
    content:
      "The lion (Panthera leo) is a large cat of the genus Panthera native to Africa and India. It has a muscular, broad-chested body, short, rounded head, round ears, and a hairy tuft at the end of its tail. It is sexually dimorphic; adult male lions are larger than females and have a prominent mane. It is a social species, forming groups called prides. A lion's pride consists of a few adult males, related females, and cubs. Groups of female lions usually hunt together, preying mostly on large ungulates. The lion is an apex and keystone predator; although some lions scavenge when opportunities occur and have been known to hunt humans, the species typically does not actively seek out and prey on humans.",
  },
  tigers: {
    key: '2',
    label: 'Tigers',
    content:
      "The tiger (Panthera tigris) is the largest living cat species and a member of the genus Panthera. It is most recognisable for its dark vertical stripes on orange fur with a white underside. An apex predator, it primarily preys on ungulates such as deer and wild boar. It is territorial and generally a solitary but social predator, requiring large contiguous areas of habitat, which support its requirements for prey and rearing of its offspring. Tiger cubs stay with their mother for about two years, then become independent and leave their mother's home range to establish their own.",
  },
  bears: {
    key: '3',
    label: 'Bears',
    content:
      'Bears are carnivoran mammals of the family Ursidae. They are classified as caniforms, or doglike carnivorans. Although only eight species of bears are extant, they are widespread, appearing in a wide variety of habitats throughout the Northern Hemisphere and partially in the Southern Hemisphere. Bears are found on the continents of North America, South America, Europe, and Asia. Common characteristics of modern bears include large bodies with stocky legs, long snouts, small rounded ears, shaggy hair, plantigrade paws with five nonretractile claws, and short tails.',
  },
  ohmy: {
    key: '4',
    label: 'Oh my!',
    content:
      'George Takei (Japanese: ジョージ・タケイ, born Hosato Takei (武井 穂郷); April 20, 1937) is an American actor, author, and activist. He is internationally known for his role as Hikaru Sulu, helmsman of the fictional starship USS Enterprise in the television series Star Trek and subsequent films.[1][2]',
  },
}

function TemplateVertical() {
  const orientation = 'vertical'
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation,
    children: Object.entries(tabs).map(([key, tab]) => (
      <TabListItem
        key={key}
        width={orientation === 'vertical' ? '100%' : 'auto'}
      >
        {tab.label}
      </TabListItem>
    )),
  }

  const tabState = useTabListState(tabListStateProps)

  return (
    <Div>
      <Flex flexDirection={orientation === 'vertical' ? 'row' : 'column'}>
        <TabList
          state={tabState}
          stateProps={tabListStateProps}
          flexShrink={0}
          marginRight={orientation === 'vertical' ? 'large' : 0}
          marginBottom={orientation === 'vertical' ? 0 : 'xlarge'}
          width={orientation === 'vertical' ? '100px' : '100%'}
        />
        <Div>
          <H1
            title1
            marginBottom="medium"
          >
            {tabs[tabState.selectedKey]?.label}
          </H1>
          <TabPanel
            state={tabState}
            stateProps={tabListStateProps}
            paddingTop="large"
            paddingBottom="large"
            borderTop="1px solid border"
            borderBottom="1px solid border"
          >
            {tabs[tabState.selectedKey]?.content}
          </TabPanel>
        </Div>
      </Flex>
    </Div>
  )
}

function TemplateHorizontal() {
  const orientation = 'horizontal'
  const tabListProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation,
    children: Object.entries(tabs).map(([key, tab]) => (
      <TabListItem
        key={key}
        width="auto"
      >
        {tab.label}
      </TabListItem>
    )),
  }

  const tabState = useTabListState(tabListProps)

  return (
    <Div>
      <Flex flexDirection="column">
        <TabList
          state={tabState}
          stateProps={tabListProps}
          flexShrink={0}
          marginRight={0}
          marginBottom="xlarge"
          width="100%"
        />
        <Div>
          <H1
            title1
            marginBottom="medium"
          >
            {tabs[tabState.selectedKey]?.label}
          </H1>
          <TabPanel
            state={tabState}
            stateProps={tabListProps}
            paddingTop="large"
            paddingBottom="large"
            borderTop="1px solid border"
            borderBottom="1px solid border"
          >
            {tabs[tabState.selectedKey]?.content}
          </TabPanel>
        </Div>
      </Flex>
    </Div>
  )
}

function TemplateComplex() {
  const [selectedTabKey, setSelectedTabKey] = useState<Key>('lions')
  const orientation = 'vertical'
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    selectedKey: selectedTabKey,
    onSelectionChange: key => {
      setSelectedTabKey(key)
    },
    orientation,
    children: [
      <TabListItem
        width="100%"
        key="lions"
      >
        Lions
      </TabListItem>,
      <TabListItem
        key="tigers"
        renderer={({ children, ...props }, ref) => (
          <Div
            {...props}
            ref={ref}
            width="100%"
            border="2px solid border-error"
          >
            {children}
          </Div>
        )}
      >
        Wrapped tigers
      </TabListItem>,
      <TabListItem
        key="bears"
        renderer={({ ...props }, ref, tabState) => (
          <Flex
            justifyContent="center"
            alignItems="center"
            {...props}
            ref={ref}
            width="100%"
            padding="20px"
            textAlign="center"
            border="1px solid border-fill-two"
          >
            <Div
              subtitle2
              padding="small"
              background={
                tabState?.selectedKey === 'bears'
                  ? 'action-primary'
                  : 'fill-two'
              }
            >
              Com&shy;plete&shy;ly custom bears
            </Div>
          </Flex>
        )}
      />,
    ],
  }

  const tabState = useTabListState(tabListStateProps)

  return (
    <Div>
      <Flex flexDirection={orientation === 'vertical' ? 'row' : 'column'}>
        <TabList
          state={tabState}
          stateProps={tabListStateProps}
          flexShrink={0}
          marginRight={orientation === 'vertical' ? 'large' : 0}
          marginBottom={orientation === 'vertical' ? 0 : 'xlarge'}
          width={orientation === 'vertical' ? '200px' : '100%'}
          renderer={(props, ref, tabState) => (
            <Div
              ref={ref}
              {...props}
              padding="10px"
              border="1px solid"
              borderColor={
                tabState.selectedKey === 'lions'
                  ? 'border.primary'
                  : tabState.selectedKey === 'tigers'
                    ? 'border-warning'
                    : tabState.selectedKey === 'bears'
                      ? 'border-success'
                      : 'border-error'
              }
            />
          )}
        />
        <Div>
          <H1
            title1
            marginBottom="medium"
          >
            {tabs[tabState.selectedKey]?.label}
          </H1>
          <TabPanel
            state={tabState}
            stateProps={tabListStateProps}
            paddingTop="large"
            paddingBottom="large"
            borderTop="1px solid border"
            borderBottom="1px solid border"
            renderer={(props, ref, tabState) => (
              <Button
                ref={ref}
                {...props}
              >
                {tabs[tabState.selectedKey]?.content}
              </Button>
            )}
          />
        </Div>
      </Flex>
    </Div>
  )
}

function TemplateSubTabs() {
  const orientation = 'horizontal'
  const tabListProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation,
    children: Object.entries(tabs).map(([key, tab]) => (
      <TabListItem
        key={key}
        width="auto"
      >
        {tab.label}
      </TabListItem>
    )),
  }

  const tabState = useTabListState(tabListProps)

  return (
    <Div>
      <Flex flexDirection="column">
        <TabList
          state={tabState}
          stateProps={tabListProps}
          flexShrink={0}
          marginRight={0}
          marginBottom="xlarge"
          width="100%"
          tabStyle="subtab"
        />
        <Div>
          <H1
            title1
            marginBottom="medium"
          >
            {tabs[tabState.selectedKey]?.label}
          </H1>
          <TabPanel
            state={tabState}
            stateProps={tabListProps}
            paddingTop="large"
            paddingBottom="large"
            borderTop="1px solid border"
            borderBottom="1px solid border"
          >
            {tabs[tabState.selectedKey]?.content}
          </TabPanel>
        </Div>
      </Flex>
    </Div>
  )
}

export const Default = TemplateHorizontal.bind({})
Default.args = {}

export const Vertical = TemplateVertical.bind({})
Vertical.args = {}

export const SubTabs = TemplateSubTabs.bind({})
SubTabs.args = {}

export const AdvancedContent = TemplateComplex.bind({})
AdvancedContent.args = {}
