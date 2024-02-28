import { useCallback, useContext, useState } from 'react'
import { Button, Modal, Switch, ValidatedInput } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import {
  BindingAttributes,
  PersonaConfigurationAttributes,
  PersonasDocument,
  useCreatePersonaMutation,
} from 'generated/graphql'
import { RequiredDeep } from 'type-fest'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import BillingFeatureBlockModal from 'components/billing/BillingFeatureBlockModal'

import { useTheme } from 'styled-components'

import { appendConnection, updateCache } from '../../../utils/graphql'
import { GqlError } from '../../utils/Alert'

const DEFAULT_CONFIGURATION = {
  all: true,
  deployments: {},
  sidebar: {},
} as const satisfies RequiredDeep<PersonaConfigurationAttributes>

const configTabs = {
  deployments: 'Deployments',
  sidebar: 'Sidebar',
} as const satisfies Record<
  Exclude<keyof typeof DEFAULT_CONFIGURATION, 'all'>,
  string
>

export default function PersonaCreate() {
  const theme = useTheme()
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [blockModalVisible, setBlockModalVisible] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [configuration, setConfiguration] =
    useState<PersonaConfigurationAttributes>(DEFAULT_CONFIGURATION)
  const [bindings, setBindings] = useState<BindingAttributes[]>([])

  const resetAndClose = useCallback(() => {
    setName('')
    setDescription('')
    setCreateModalVisible(false)
  }, [])

  const [mutation, { loading, error }] = useCreatePersonaMutation({
    variables: { attributes: { name, description, configuration, bindings } },
    onCompleted: () => resetAndClose(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: PersonasDocument,
        update: (prev) =>
          appendConnection(prev, data?.createPersona, 'personas'),
      }),
  })

  return (
    <>
      <Button
        secondary
        onClick={() =>
          isAvailable ? setCreateModalVisible(true) : setBlockModalVisible(true)
        }
      >
        Create persona
      </Button>

      {/* Modals */}
      <Modal
        header="Create persona"
        open={createModalVisible}
        onClose={() => resetAndClose()}
        actions={
          <>
            <Button
              secondary
              onClick={() => resetAndClose()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isEmpty(name)}
              onClick={() => mutation()}
              loading={loading}
              marginLeft="medium"
            >
              Create
            </Button>
          </>
        }
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
          }}
        >
          {error && (
            <GqlError
              header="Something went wrong"
              error={error}
            />
          )}
          <ValidatedInput
            value={name}
            onChange={({ target: { value } }) => setName(value)}
            label="Name"
          />
          <ValidatedInput
            label="Description"
            value={description}
            onChange={({ target: { value } }) => setDescription(value)}
          />
        </div>
        <div>
          <Switch
            checked={configuration.all}
            onChange={() =>
              setConfiguration((cfg) => ({ ...cfg, all: !cfg.all }))
            }
          >
            All
          </Switch>
          {!configuration.all && (
            <>
              <div>Configuration options</div>{' '}
              {
                /* Placeholder */ Object.entries(configTabs).map(
                  ([key, label]) => (
                    <div key={key}>{label}</div>
                  )
                )
              }
            </>
          )}
        </div>
      </Modal>
      <BillingFeatureBlockModal
        open={blockModalVisible}
        message="Upgrade to Plural Professional to create a persona."
        onClose={() => setBlockModalVisible(false)}
      />
    </>
  )
}
