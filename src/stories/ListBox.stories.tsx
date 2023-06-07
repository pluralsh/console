import { Div, Flex } from 'honorable'
import { type Key, useState } from 'react'

import {
  AppIcon,
  Chip,
  ListBox,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  ListBoxItemChipList,
  PersonIcon,
} from '../index'

export default {
  title: 'List Box',
  component: ListBox,
}

const portrait = (
  <AppIcon
    spacing="none"
    size="xsmall"
    url="photo.png"
  />
)
const smallIcon = <PersonIcon size={16} />

const chipProps = {
  size: 'small',
} as const

const chips = [
  <Chip
    severity="success"
    {...chipProps}
  >
    Installed
  </Chip>,
  <Chip
    severity="neutral"
    {...chipProps}
  >
    Warm
  </Chip>,
  <Chip
    severity="neutral"
    {...chipProps}
  >
    Latest
  </Chip>,
  <Chip
    severity="warning"
    {...chipProps}
  >
    Additional
  </Chip>,
  <Chip
    severity="error"
    {...chipProps}
  >
    Extra
  </Chip>,
  <Chip
    severity="info"
    {...chipProps}
  >
    Another
  </Chip>,
]

const items = [
  {
    key: 'ratatouille',
    label: 'Ratatouille',
    description: 'With ham and cheese',
    chips: chips.slice(0, 1),
    version: '0.2.24',
  },
  {
    key: 'pizza',
    label: 'Pizza',
    description: 'With ham and cheese',
    chips: chips.slice(1, 3),
    version: '0.2.25',
  },
  {
    key: 'sushi',
    label: 'Sushi',
    description: 'With ham and cheese',
    chips: null,
    version: '0.2.26',
  },
  {
    key: 'couscous',
    label: 'Couscous',
    description: 'With ham and cheese',
    chips: chips.slice(4),
    version: '0.3.00',
  },
  {
    key: 'dim-sum',
    label: 'Dim Sum',
    description: 'With ham and cheese',
    chips: chips.slice(4, 5),
    version: '0.3.01',
  },
  {
    key: 'ratatouille2',
    label: 'Ratatouille',
    description: 'With ham and cheese',
    chips: [chips[0], chips[3], chips[5]],
    version: '0.3.02',
  },
  {
    key: 'pizza2',
    label: 'Pizza',
    description: 'With ham and cheese',
    chips: [chips[5], chips[0]],
    version: '0.3.05',
  },
  {
    key: 'sushi2',
    label: 'Sushi',
    description: 'With ham and cheese',
    chips: chips.slice(0),
    version: '0.3.12',
  },
  {
    key: 'couscous2',
    label: 'Couscous',
    description: 'With ham and cheese',
    chips: chips.slice(0).reverse(),
    version: '0.4.00',
  },
  {
    key: 'dim-sum2',
    label: 'Dim Sum',
    description: 'With ham and cheese',
    chips: chips.slice(5).reverse(),
    version: '0.4.01',
  },
]

function Template() {
  const [selectedKey, setSelectedKey] = useState<Key>()
  const shownStep = 4
  const [shownLimit, setShownLimit] = useState<number>(shownStep)

  return (
    <Flex
      flexDirection="column"
      gap="large"
    >
      <Div maxWidth={512}>
        <ListBox
          selectedKey={selectedKey}
          onSelectionChange={(key) => {
            setSelectedKey(key)
          }}
          extendStyle={{
            width: 'max-content',
          }}
        >
          {items.slice(0, 4).map(({ key, label }) => (
            <ListBoxItem
              key={key}
              label={label}
              leftContent={smallIcon}
              reserveSelectedIndicatorSpace
            />
          ))}
        </ListBox>
      </Div>
      <Div
        display="flex"
        flexDirection="column"
        maxWidth={512}
        maxHeight={200}
        overflow="hidden"
      >
        <ListBox
          selectedKey={selectedKey}
          onSelectionChange={(key) => {
            setSelectedKey(key)
          }}
          footerFixed={
            <ListBoxFooter onClick={() => alert('You clicked the footer')}>
              Fixed Footer - Default
            </ListBoxFooter>
          }
        >
          {items.map(({ key, label, description }) => (
            <ListBoxItem
              key={key}
              label={label}
              description={description}
              leftContent={portrait}
            />
          ))}
        </ListBox>
      </Div>

      <Div
        display="flex"
        flexDirection="column"
        maxWidth={512}
        maxHeight={200}
        overflow="hidden"
      >
        <ListBox
          selectedKey={selectedKey}
          onSelectionChange={(key) => {
            setSelectedKey(key)
          }}
          footerFixed={
            <ListBoxFooterPlus onClick={() => alert('You clicked the footer')}>
              Fixed Footer - Add
            </ListBoxFooterPlus>
          }
        >
          {items.map(({ key, label, description, chips }) => (
            <ListBoxItem
              key={key}
              label={label}
              description={description}
              rightContent={<ListBoxItemChipList chips={chips} />}
              leftContent={portrait}
            />
          ))}
        </ListBox>
      </Div>

      <Div
        display="flex"
        flexDirection="column"
        maxWidth={224}
        maxHeight={200}
        overflow="hidden"
      >
        <ListBox
          selectedKey={selectedKey}
          onSelectionChange={(key) => {
            setSelectedKey(key)
          }}
          footer={
            shownLimit < items.length && (
              <ListBoxFooterPlus>View more</ListBoxFooterPlus>
            )
          }
          onFooterClick={() => {
            setShownLimit(shownLimit + shownStep)
          }}
        >
          {items.slice(0, shownLimit).map(({ key, chips, version }) => (
            <ListBoxItem
              key={key}
              label={version}
              rightContent={
                <ListBoxItemChipList
                  maxVisible={2}
                  showExtra
                  chips={chips}
                />
              }
            />
          ))}
        </ListBox>
      </Div>

      <Div
        display="flex"
        flexDirection="column"
        maxWidth={224}
        maxHeight={200}
        overflow="hidden"
      >
        <ListBox
          extendStyle={{ width: 'max-content' }}
          selectedKey={null}
          onSelectionChange={(key) => {
            setSelectedKey(key)
          }}
        >
          <ListBoxItem
            key="add-user"
            label="Add user"
            textValue="Add user"
          />
          <ListBoxItem
            key="modify-user"
            label="Modify user"
            textValue="Modify user"
          />
          <ListBoxItem
            key="delete-user"
            label="Delete user"
            destructive
          />
        </ListBox>
      </Div>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {}
