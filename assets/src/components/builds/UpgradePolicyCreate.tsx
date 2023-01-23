import { useContext, useState } from 'react'
import { Button, Select } from 'forge-core'

import { useMutation } from '@apollo/client'

import { Box } from 'grommet'

import { LabelledInput } from 'components/utils/LabelledInput'

import { CREATE_POLICY, UPGRADE_POLICIES } from '../graphql/builds'

import { updateCache } from '../../utils/graphql'

import UpgradePoliciesList from './UpgradePoliciesList'
import { PolicyContext } from './UpgradePolicies'

const UpgradePolicyType = {
  DEPLOY: 'DEPLOY',
  APPROVAL: 'APPROVAL',
  IGNORE: 'IGNORE',
}

const toSelect = v => ({ label: v, value: v })

export default function UpgradePolicyCreate() {
  const [attributes, setAttributes] = useState({
    name: '',
    description: '',
    weight: 0,
    target: '*',
    type: UpgradePolicyType.DEPLOY,
  })
  const { setModal } = useContext<any>(PolicyContext)

  const [mutation, { loading }] = useMutation(CREATE_POLICY, {
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
    <Box gap="small">
      <LabelledInput
        width="100%"
        color="dark-2"
        weight={450}
        label="Name"
        value={attributes.name}
        placeholder="Name for this policy"
        onChange={name => setAttributes({ ...attributes, name })}
        type={undefined}
        modifier={undefined}
      />
      <LabelledInput
        width="100%"
        color="dark-2"
        weight={450}
        label="Description"
        value={attributes.description}
        placeholder="description for this policy"
        onChange={description => setAttributes({ ...attributes, description })}
        type={undefined}
        modifier={undefined}
      />
      <LabelledInput
        width="100%"
        color="dark-2"
        weight={450}
        label="Target"
        value={attributes.target}
        placeholder="repos to target (wildcards allowed)"
        onChange={target => setAttributes({ ...attributes, target })}
        type={undefined}
        modifier={undefined}
      />
      <LabelledInput
        width="100%"
        color="dark-2"
        weight={450}
        label="Weight"
        value={`${attributes.weight}`}
        placeholder="weight for this policy"
        onChange={weight => setAttributes({ ...attributes, weight: parseInt(weight) })}
        type={undefined}
        modifier={undefined}
      />
      <Select
        options={Object.values(UpgradePolicyType).map(toSelect)}
        value={toSelect(attributes.type)}
        onChange={({ value }) => setAttributes({ ...attributes, type: value })}
      />
      <Box
        direction="row"
        align="center"
        justify="end"
      >
        <Button
          label="Create"
          onClick={mutation}
          loading={loading}
        />
      </Box>
    </Box>
  )
}
