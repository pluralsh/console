import {
  Button,
  ChipList,
  FormField,
  Modal,
  SubTab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'
import { PersonaFragment, PolicyBinding } from 'generated/graphql'

import { useRef, useState } from 'react'

import { useTheme } from 'styled-components'

import { Body2P } from 'components/utils/typography/Text'

import { PersonaAttributes } from './PersonaAttributesEdit'
import { splitBindings } from 'components/utils/bindings'

const tabs = [
  {
    label: 'Attributes',
    key: 'attributes',
  },
  { label: 'Members', key: 'members' },
] as const

export default function PersonaView({
  open,
  onClose,
  persona,
}: {
  open: boolean
  onClose: () => void
  persona: PersonaFragment
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(undefined)
  const [currentTab, setCurrentTab] =
    useState<(typeof tabs)[number]['key']>('attributes')

  return (
    <Modal
      header={`View ‘${persona.name}’ persona`}
      open={open}
      onClose={onClose}
      actions={
        <Button
          primary
          onClick={onClose}
        >
          Close
        </Button>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            onSelectionChange: (key) => setCurrentTab(key as any),
          }}
        >
          {tabs.map((tab) => (
            <SubTab key={tab.key}>{tab.label}</SubTab>
          ))}
        </TabList>
        <TabPanel stateRef={tabStateRef}>
          {currentTab === 'attributes' && (
            <PersonaAttributes
              name={persona.name || ''}
              description={persona.description || ''}
              configuration={persona.configuration || { all: true }}
            />
          )}
          {currentTab === 'members' && (
            <PersonaMembers bindings={persona.bindings} />
          )}
        </TabPanel>
      </div>
    </Modal>
  )
}

function PersonaMembers({
  bindings,
}: {
  bindings: Nullable<Nullable<PolicyBinding>[]>
}) {
  const theme = useTheme()
  const { groupBindings } = splitBindings(bindings || [])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <FormField label="Groups">
        {groupBindings?.length ? (
          <ChipList
            values={groupBindings.map(({ group }) => group?.name)}
            limit={30}
          />
        ) : (
          <Body2P css={{ color: theme.colors['text-light'] }}>No groups</Body2P>
        )}
      </FormField>
    </div>
  )
}
