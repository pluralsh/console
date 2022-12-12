import React, {
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import {
  Button,
  Configuration,
  ModalHeader,
  Select,
  Trash,
} from 'forge-core'

import { useMutation, useQuery } from 'react-apollo'

import {
  Box,
  Drop,
  Layer,
  Text,
} from 'grommet'

import { LabelledInput } from '../utils/LabelledInput'
import { CREATE_POLICY, DELETE_POLICY, UPGRADE_POLICIES } from '../graphql/builds'

import { updateCache } from '../../utils/graphql'

const UpgradePolicyType = {
  DEPLOY: 'DEPLOY',
  APPROVAL: 'APPROVAL',
  IGNORE: 'IGNORE',
}

const PolicyContext = React.createContext({})

const toSelect = v => ({ label: v, value: v })

export function Icon({
  tooltip, icon, iconProps, onClick, background, hoverIndicator,
}) {
  const ref = useRef()
  const [hover, setHover] = useState(false)

  return (
    <>
      <Box
        ref={ref}
        pad="small"
        round="xsmall"
        onClick={onClick}
        align="center"
        justify="center"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        background={background}
        hoverIndicator={hoverIndicator || 'tone-light'}
      >
        {React.createElement(icon, { ...{ size: '15px' }, ...iconProps })}
      </Box>
      {hover && (
        <Drop
          target={ref.current}
          align={{ bottom: 'top' }}
          plain
        >
          <Box
            round="xsmall"
            pad={{ vertical: 'xsmall', horizontal: 'small' }}
            background="sidebar"
          >
            <Text size="small">{tooltip}</Text>
          </Box>
        </Drop>
      )}
    </>
  )
}

function UpgradePolicy({ policy }) {
  const [mutation] = useMutation(DELETE_POLICY, {
    variables: { id: policy.id },
    update: (cache, { data: { deleteUpgradePolicy } }) => updateCache(cache, {
      query: UPGRADE_POLICIES,
      update: prev => ({
        ...prev,
        upgradePolicies: prev.upgradePolicies.filter(({ id }) => id !== deleteUpgradePolicy.id),
      }),
    }),
  })

  return (
    <Box
      direction="row"
      align="center"
      border={{ side: 'bottom', color: 'tone-light' }}
      pad={{ vertical: 'xsmall' }}
    >
      <Box
        fill="horizontal"
        direction="row"
        gap="small"
        align="center"
      >
        <Text
          size="small"
          weight={500}
        >{policy.name}
        </Text>
        <Text size="small"><i>{policy.description}</i></Text>
      </Box>
      <Icon
        icon={Trash}
        iconProps={{ size: '14px', color: 'red' }}
        tooltip="delete"
        onClick={mutation}
      />
    </Box>
  )
}

function Policies() {
  const { setModal } = useContext(PolicyContext)
  const { data } = useQuery(UPGRADE_POLICIES, { fetchPolicy: 'cache-and-network' })

  if (!data) return null

  const { upgradePolicies } = data

  return (
    <Box gap="xsmall">
      {upgradePolicies.map(policy => (
        <UpgradePolicy
          key={policy.id}
          policy={policy}
        />
      ))}
      <Box
        pad={{ top: 'small' }}
        direction="row"
        justify="end"
      >
        <Button
          label="Create More"
          onClick={() => setModal({
            header: 'Create Upgrade Policy',
            content: <PolicyForm />,
          })}
        />
      </Box>
    </Box>
  )
}

export function PolicyForm() {
  const [attributes, setAttributes] = useState({
    name: '',
    description: '',
    weight: 0,
    target: '*',
    type: UpgradePolicyType.DEPLOY,
  })
  const { setModal } = useContext(PolicyContext)

  const [mutation, { loading }] = useMutation(CREATE_POLICY, {
    variables: { attributes },
    update: (cache, { data: { createUpgradePolicy } }) => updateCache(cache, {
      query: UPGRADE_POLICIES,
      update: prev => ({ ...prev, upgradePolicies: [...prev.upgradePolicies, createUpgradePolicy] }),
    }),
    onCompleted: () => setModal({
      header: 'Upgrade Policies',
      content: <Policies />,
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
      />
      <LabelledInput
        width="100%"
        color="dark-2"
        weight={450}
        label="Description"
        value={attributes.description}
        placeholder="description for this policy"
        onChange={description => setAttributes({ ...attributes, description })}
      />
      <LabelledInput
        width="100%"
        color="dark-2"
        weight={450}
        label="Target"
        value={attributes.target}
        placeholder="repos to target (wildcards allowed)"
        onChange={target => setAttributes({ ...attributes, target })}
      />
      <LabelledInput
        width="100%"
        color="dark-2"
        weight={450}
        label="Weight"
        value={`${attributes.weight}`}
        placeholder="weight for this policy"
        onChange={weight => setAttributes({ ...attributes, weight: parseInt(weight) })}
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

export function UpgradePolicies() {
  const [modal, setModal] = useState(null)
  const close = useCallback(() => setModal(null), [setModal])

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <PolicyContext.Provider value={{ modal, setModal, close }}>
      <>
        <Icon
          icon={Configuration}
          tooltip="upgrade settings"
          hoverIndicator="card"
          onClick={() => setModal({
            header: 'Upgrade Policies',
            content: <Policies />,
          })}
        />
        {modal && (
          <Layer
            modal
            onEsc={close}
            onClickOutside={close}
          >
            <Box width="50vw">
              <ModalHeader
                text={modal.header}
                setOpen={setModal}
              />
              <Box
                fill
                pad="small"
              >
                {modal.content}
              </Box>
            </Box>
          </Layer>
        )}
      </>
    </PolicyContext.Provider>
  )
}
