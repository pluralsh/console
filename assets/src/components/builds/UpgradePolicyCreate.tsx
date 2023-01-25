import { useContext, useState } from 'react'

import { useMutation } from '@apollo/client'

import {
  Button,
  FormField,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'

import { Flex } from 'honorable'

import { isEmpty } from 'lodash'

import { GqlError } from 'components/utils/Alert'

import { CREATE_POLICY, UPGRADE_POLICIES } from '../graphql/builds'

import { updateCache } from '../../utils/graphql'

import UpgradePoliciesList from './UpgradePoliciesList'
import { PolicyContext } from './UpgradePolicies'

const UpgradePolicyType = {
  DEPLOY: 'DEPLOY',
  APPROVAL: 'APPROVAL',
  IGNORE: 'IGNORE',
}

export default function UpgradePolicyCreate() {
  const [attributes, setAttributes] = useState({
    name: '',
    description: '',
    weight: 0,
    target: '*',
    type: UpgradePolicyType.DEPLOY,
  })
  const { setModal } = useContext<any>(PolicyContext)

  const [mutation, { error, loading }] = useMutation(CREATE_POLICY, {
    variables: { attributes },
    update: (cache, { data: { createUpgradePolicy } }) => updateCache(cache, {
      query: UPGRADE_POLICIES,
      update: prev => ({ ...prev, upgradePolicies: [...prev.upgradePolicies, createUpgradePolicy] }),
    }),
    onCompleted: () => setModal({
      header: 'Upgrade Policies',
      content: <UpgradePoliciesList />,
    }),
  })

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <FormField label="Name">
        <Input
          placeholder="New upgrade policy"
          onChange={({ target: { value } }) => setAttributes({ ...attributes, name: value })}
          value={attributes.name}
        />
      </FormField>
      <FormField label="Description">
        <Input
          onChange={({ target: { value } }) => setAttributes({ ...attributes, description: value })}
          value={attributes.description}
        />
      </FormField>
      <FormField label="Type">
        <Select
          aria-label="type"
          label="Choose type"
          selectedKey={attributes.type}
          onSelectionChange={type => setAttributes({ ...attributes, type: `${type}` })}
        >
          {Object.values(UpgradePolicyType).map(v => (
            <ListBoxItem
              key={v}
              label={v}
              textValue={v}
            />
          ))}
        </Select>
      </FormField>
      <FormField
        label="App bindings"
        hint="Target applications using a regex expression, e.g. “*” to select all."
      >
        <Input
          placeholder="*"
          onChange={({ target: { value } }) => setAttributes({ ...attributes, target: value })}
          value={attributes.target}
        />
      </FormField>
      <FormField
        label="Weight"
        hint="Higher weights get priorized over lower weights."
      >
        <Input
          placeholder="0"
          onChange={({ target: { value } }) => setAttributes({ ...attributes, weight: parseInt(value) })}
          value={attributes.weight}
        />
      </FormField>
      {error && (
        <GqlError
          error={error}
          header="Failed to create upgrade policy"
        />
      )}
      <Flex
        gap="medium"
        justify="end"
      >
        <Button
          secondary
          onClick={() => setModal({
            header: 'Upgrade Policies',
            content: <UpgradePoliciesList />,
          })}
        >
          Cancel
        </Button>
        <Button
          disabled={isEmpty(attributes?.name)}
          loading={loading}
          onClick={() => mutation()}
        >
          Create
        </Button>
      </Flex>
    </Flex>
  )
}
