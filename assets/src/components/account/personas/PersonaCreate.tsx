import { useCallback, useContext, useRef, useState } from 'react'
import {
  Button,
  Modal,
  SubTab,
  Switch,
  TabList,
  TabPanel,
  ValidatedInput,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import {
  BindingAttributes,
  PersonaConfigurationAttributes,
  PersonasDocument,
  useCreatePersonaMutation,
} from 'generated/graphql'
import { RequiredDeep } from 'type-fest'
import { produce } from 'immer'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import BillingFeatureBlockModal from 'components/billing/BillingFeatureBlockModal'

import { useTheme } from 'styled-components'

import { Body2BoldP } from 'components/utils/typography/Text'

import upperFirst from 'lodash/upperFirst'

import capitalize from 'lodash/capitalize'

import { appendConnection, updateCache } from '../../../utils/graphql'
import { GqlError } from '../../utils/Alert'

const DEFAULT_CONFIGURATION = {
  all: true,
  deployments: {
    addOns: true,
    clusters: true,
    deployments: true,
    pipelines: true,
    providers: true,
    services: true,
  },
  sidebar: {
    audits: true,
    kubernetes: true,
    pullRequests: true,
    settings: true,
  },
} as const satisfies RequiredDeep<PersonaConfigurationAttributes>

const configTabs = {
  deployments: 'Deployments',
  sidebar: 'Sidebar',
} as const satisfies Record<
  Exclude<keyof typeof DEFAULT_CONFIGURATION, 'all'>,
  string
>

function configKeyToLabel(key: string) {
  return capitalize(key.split(/(?=[A-Z])/).join(' '))
}

export function PersonaConfigurationEdit({
  configuration,
  setConfiguration,
}: {
  configuration: PersonaConfigurationAttributes
  setConfiguration: (cfg: PersonaConfigurationAttributes) => void
}) {
  const tabStateRef = useRef<any>()
  const [tabKey, setTabKey] = useState<keyof typeof configTabs>('deployments')

  return (
    <div>
      <Body2BoldP as="h2">Configuration options</Body2BoldP>

      <Switch
        checked={!!configuration.all}
        onChange={() =>
          setConfiguration(
            produce(configuration, (draft) => {
              draft.all = !configuration.all
            })
          )
        }
      >
        All
      </Switch>
      {true && (
        <div>
          <TabList
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: tabKey,
              onSelectionChange: (key) => setTabKey(key as any),
            }}
          >
            {Object.entries(configTabs).map(([key, label]) => (
              <SubTab key={key}>{upperFirst(label)}</SubTab>
            ))}
          </TabList>
          {Object.entries(configTabs).map(([key]) => (
            <TabPanel
              key={key}
              tabKey={key}
              mode="multipanel"
              stateRef={tabStateRef}
            >
              {Object.entries(configuration[key]).map(([subKey, checked]) => (
                <Switch
                  key={subKey}
                  disabled={!!configuration.all}
                  checked={!!configuration.all || !!checked}
                  onChange={() =>
                    setConfiguration(
                      produce(configuration, (draft) => {
                        draft[key][subKey] = !draft[key][subKey]
                      })
                    )
                  }
                >
                  {configKeyToLabel(subKey)}
                </Switch>
              ))}
            </TabPanel>
          ))}
        </div>
      )}
    </div>
  )
}

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
          <div>
            <PersonaConfigurationEdit
              configuration={configuration}
              setConfiguration={setConfiguration}
            />
          </div>
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
