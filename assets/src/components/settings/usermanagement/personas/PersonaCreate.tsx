import {
  ComponentProps,
  FormEventHandler,
  useCallback,
  useContext,
  useState,
} from 'react'
import {
  BriefcaseIcon,
  Button,
  Modal,
  PeopleIcon,
  Stepper,
} from '@pluralsh/design-system'
import {
  BindingAttributes,
  PersonaConfigurationAttributes,
  PersonasDocument,
  useCreatePersonaMutation,
} from 'generated/graphql'
import { RequiredDeep } from 'type-fest'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import BillingFeatureBlockModal from 'components/billing/BillingFeatureBlockModal'
import styled, { useTheme } from 'styled-components'
import capitalize from 'lodash/capitalize'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { appendConnection, updateCache } from '../../../../utils/graphql'
import { GqlError } from '../../../utils/Alert'

import {
  PersonaBindings,
  bindingsToBindingAttributes,
} from './PersonaBindingsEdit'
import { PersonaAttributes } from './PersonaAttributesEdit'

const DEFAULT_CONFIGURATION = {
  all: true,
  home: {
    manager: false,
    security: false,
  },
  deployments: {
    addOns: true,
    clusters: true,
    deployments: true,
    pipelines: true,
    providers: true,
    repositories: true,
    services: true,
  },
  sidebar: {
    audits: true,
    kubernetes: true,
    pullRequests: true,
    settings: true,
    stacks: true,
    backups: true,
    cost: true,
    security: true,
  },
  services: {
    secrets: true,
    configuration: true,
  },
} as const satisfies RequiredDeep<PersonaConfigurationAttributes>

export const configTabs = {
  home: 'Homepage',
  deployments: 'Continuous deployment',
  sidebar: 'Sidebar',
  services: 'Services',
} as const satisfies Record<
  Exclude<keyof typeof DEFAULT_CONFIGURATION, 'all'>,
  string
>

export function configKeyToLabel(key: string) {
  return capitalize(key.split(/(?=[A-Z])/).join(' '))
}

const stepBase = {
  circleSize: 32,
  iconSize: 16,
  vertical: true,
}
const StepTitle = styled.div(({ theme }) => ({
  marginRight: theme.spacing.small,
}))
const steps: ComponentProps<typeof Stepper>['steps'] = [
  {
    key: 'create-repo',
    stepTitle: <StepTitle>Persona info</StepTitle>,
    IconComponent: BriefcaseIcon,
    ...stepBase,
  },
  {
    key: 'choose-cloud',
    stepTitle: <StepTitle>Persona Bindings</StepTitle>,
    IconComponent: PeopleIcon,
    ...stepBase,
  },
]

export default function PersonaCreate() {
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [blockModalVisible, setBlockModalVisible] = useState(false)

  return (
    <>
      <Button
        floating
        onClick={() =>
          isAvailable ? setCreateModalVisible(true) : setBlockModalVisible(true)
        }
      >
        Create persona
      </Button>
      <ModalMountTransition open={createModalVisible}>
        <PersonaCreateModal
          open={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
        />
      </ModalMountTransition>
      <BillingFeatureBlockModal
        open={blockModalVisible}
        message="Upgrade to Plural Professional to create a persona."
        onClose={() => setBlockModalVisible(false)}
      />
    </>
  )
}

export function PersonaCreateModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [configuration, setConfiguration] =
    useState<PersonaConfigurationAttributes>(DEFAULT_CONFIGURATION)
  const [bindings, setBindings] = useState<BindingAttributes[]>([])
  const [step, setStep] = useState<0 | 1>(0)

  const [mutation, { loading, error }] = useCreatePersonaMutation({
    onCompleted: () => onClose(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: PersonasDocument,
        update: (prev) =>
          appendConnection(prev, data?.createPersona, 'personas'),
      }),
  })

  const attributesValid = !!name
  const allowSubmit = attributesValid

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault()
      if (bindings && allowSubmit) {
        mutation({
          variables: {
            attributes: {
              name,
              description,
              configuration,
              bindings: bindingsToBindingAttributes(bindings),
            },
          },
        })
      }
    },
    [allowSubmit, bindings, configuration, description, mutation, name]
  )

  return (
    <Modal
      header="Create persona"
      open={open}
      asForm
      formProps={{ onSubmit }}
      onClose={() => onClose()}
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.medium,
          }}
        >
          {step === 1 && (
            <Button
              type="submit"
              disabled={!allowSubmit}
              onClick={() => {
                if (allowSubmit) mutation()
              }}
              loading={loading}
            >
              Create
            </Button>
          )}
          {step === 0 && (
            <Button
              onClick={() => setStep(1)}
              disabled={!attributesValid}
            >
              Next
            </Button>
          )}
          {step === 1 && <Button onClick={() => setStep(0)}>Back</Button>}
          {step === 0 && (
            <Button
              secondary
              onClick={() => onClose()}
            >
              Cancel
            </Button>
          )}
        </div>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        <div css={{ display: 'flex' }}>
          <Stepper
            compact
            steps={steps}
            stepIndex={step}
          />
        </div>
        {step === 0 && (
          <PersonaAttributes
            {...{
              name,
              setName,
              description,
              setDescription,
              configuration,
              setConfiguration,
            }}
          />
        )}
        {step === 1 && <PersonaBindings {...{ bindings, setBindings }} />}
        {error && (
          <GqlError
            header="Something went wrong"
            error={error}
          />
        )}
      </div>
    </Modal>
  )
}
