import { Div, Flex, H4 } from 'honorable'
import {
  ComponentProps,
  Key,
  forwardRef,
  useState,
} from 'react'
import styled from 'styled-components'

import {
  AppIcon,
  Button,
  CheckIcon,
  Chip,
  DropdownArrowIcon,
  InfoIcon,
  ListBoxFooterPlus,
  ListBoxItem,
  ListBoxItemChipList,
  PersonIcon,
  SearchIcon,
  Select,
  SelectButton,
} from '../index'

export default {
  title: 'Select',
  component: 'Select',
}

const portrait = (
  <AppIcon
    spacing="none"
    size="xsmall"
    url="photo.png"
  />
)
const smallIcon = <PersonIcon size={16} />

const chipProps: Partial<ComponentProps<typeof Chip>> = {
  size: 'small',
  hue: 'lighter',
}
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

// Make sure any custom trigger button forwards ref to outermost element,
// otherwise it'll error
const CustomTriggerButton = styled(forwardRef<any, any>((props, ref) => (
  <Button
    ref={ref}
    medium
    primary
    endIcon={<DropdownArrowIcon className="dropdownIcon" />}
    {...props}
  >
    Click me!
  </Button>
)))<{ isOpen?: boolean }>(({ isOpen = false }) => ({
  '.dropdownIcon': {
    transform: isOpen ? 'scaleY(-1)' : 'scaleY(1)',
    transition: 'transform 0.1s ease',
  },
}))

function Template() {
  const [selectedKey, setSelectedKey] = useState<Key>()
  const shownStep = 4
  const [shownLimit, setShownLimit] = useState<number>(shownStep)

  const [selectedKeys, setSelectedKeys] = useState(new Set<Key>(['pizza', 'sushi']))

  const curItem = items.find(item => item.key === selectedKey)
  const customLabel = curItem
    ? `You have selected ${curItem.label}`
    : 'Select an item please'

  const curItems = items.filter(item => selectedKeys.has(item.key))
  const customLabelMultiple
    = curItems.length > 0
      ? `Selections: ${curItems.map(item => item.label).join(', ')}`
      : 'Select items'

  return (
    <Flex
      flexDirection="column"
      gap="large"
      maxWidth={512}
    >
      {/* SINGLE SELECT */}
      <Div>
        <h4>Single select</h4>
        <Select
          defaultOpen={false}
          label="Pick something"
          selectedKey={selectedKey}
          onSelectionChange={key => {
            setSelectedKey(key)
          }}
        >
          {items.slice(0, 4).map(({ key, label }) => (
            <ListBoxItem
              key={key}
              label={label}
              textValue={label}
              leftContent={smallIcon}
            />
          ))}
        </Select>
      </Div>
      <Div>
        <Select
          label="Pick something"
          selectedKey={selectedKey}
          onSelectionChange={key => {
            setSelectedKey(key)
          }}
          defaultOpen={false}
          leftContent={<SearchIcon />}
          rightContent={<ListBoxItemChipList chips={curItem?.chips} />}
          dropdownFooterFixed={
            <ListBoxFooterPlus>Create new</ListBoxFooterPlus>
          }
        >
          {items.map(({
            key, label, description, chips,
          }) => (
            <ListBoxItem
              key={key}
              label={label}
              textValue={label}
              description={description}
              rightContent={<ListBoxItemChipList chips={chips} />}
              leftContent={portrait}
            />
          ))}
        </Select>
      </Div>

      <Div>
        <Select
          label="Pick something"
          selectedKey={selectedKey}
          onSelectionChange={key => {
            setSelectedKey(key)
          }}
          defaultOpen={false}
          dropdownFooterFixed={
            <ListBoxFooterPlus>Create new</ListBoxFooterPlus>
          }
          triggerButton={(
            <SelectButton leftContent={curItem ? <CheckIcon /> : <InfoIcon />}>
              {customLabel}
            </SelectButton>
          )}
        >
          {items.map(({
            key, label, description, chips,
          }) => (
            <ListBoxItem
              key={key}
              label={label}
              textValue={label}
              description={description}
              rightContent={<ListBoxItemChipList chips={chips} />}
              leftContent={portrait}
            />
          ))}
        </Select>
      </Div>

      <Flex justifyContent="right">
        <Select
          label="Version"
          selectedKey={selectedKey}
          triggerButton={<CustomTriggerButton />}
          width="max-content"
          maxHeight={197}
          placement="right"
          onSelectionChange={key => {
            setSelectedKey(key)
          }}
          onFooterClick={() => setShownLimit(shownLimit + shownStep)}
          onOpenChange={open => {
            if (!open) setShownLimit(shownStep)
          }}
          rightContent={
            curItem && (
              <ListBoxItemChipList
                maxVisible={0}
                showExtra
                chips={curItem.chips}
              />
            )
          }
          dropdownFooter={
            shownLimit < items.length && (
              <ListBoxFooterPlus>View more</ListBoxFooterPlus>
            )
          }
        >
          {items.slice(0, shownLimit).map(({ key, chips, version }) => (
            <ListBoxItem
              key={key}
              label={version}
              textValue={version}
              rightContent={(
                <ListBoxItemChipList
                  maxVisible={1}
                  showExtra
                  chips={chips}
                />
              )}
            />
          ))}
        </Select>
      </Flex>

      {/*  */}
      {/*  */}
      {/*  */}
      {/*  */}
      {/*  */}
      {/*  */}

      {/* MULTIPLE SELECT */}
      <H4
        subtitle
        margin="0"
        marginBottom="small"
      >
        Multiple select
      </H4>
      <Div>
        <Select
          defaultOpen={false}
          label="Pick something"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={keys => {
            setSelectedKeys(keys)
          }}
        >
          {items.slice(0, 4).map(({ key, label }) => (
            <ListBoxItem
              key={key}
              label={label}
              textValue={label}
              leftContent={smallIcon}
            />
          ))}
        </Select>
      </Div>

      <Div>
        <Select
          label="Pick something"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={keys => {
            setSelectedKeys(keys)
          }}
          defaultOpen={false}
          leftContent={<SearchIcon />}
          rightContent={<ListBoxItemChipList chips={curItem?.chips} />}
          dropdownFooterFixed={
            <ListBoxFooterPlus>Create new</ListBoxFooterPlus>
          }
        >
          {items.map(({
            key, label, description, chips,
          }) => (
            <ListBoxItem
              key={key}
              label={label}
              textValue={label}
              description={description}
              rightContent={<ListBoxItemChipList chips={chips} />}
              leftContent={portrait}
            />
          ))}
        </Select>
      </Div>

      <Div>
        <Select
          label="Pick something"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={keys => {
            setSelectedKeys(keys)
          }}
          defaultOpen={false}
          dropdownFooterFixed={
            <ListBoxFooterPlus>Create new</ListBoxFooterPlus>
          }
          triggerButton={(
            <SelectButton leftContent={curItem ? <CheckIcon /> : <InfoIcon />}>
              {customLabelMultiple}
            </SelectButton>
          )}
        >
          {items.map(({
            key, label, description, chips,
          }) => (
            <ListBoxItem
              key={key}
              label={label}
              textValue={label}
              description={description}
              rightContent={<ListBoxItemChipList chips={chips} />}
              leftContent={portrait}
            />
          ))}
        </Select>
      </Div>

      <Flex justifyContent="right">
        <Select
          label="Version"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={keys => {
            setSelectedKeys(keys)
          }}
          triggerButton={<CustomTriggerButton />}
          width="max-content"
          maxHeight={197}
          placement="right"
          onFooterClick={() => {
            setShownLimit(shownLimit + shownStep)
          }}
          onOpenChange={open => {
            if (!open) setShownLimit(shownStep)
          }}
          dropdownFooter={
            shownLimit < items.length && (
              <ListBoxFooterPlus>View more</ListBoxFooterPlus>
            )
          }
        >
          {items.slice(0, shownLimit).map(({ key, chips, version }) => (
            <ListBoxItem
              key={key}
              label={version}
              textValue={version}
              rightContent={(
                <ListBoxItemChipList
                  maxVisible={1}
                  showExtra
                  chips={chips}
                />
              )}
            />
          ))}
        </Select>
      </Flex>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {}
