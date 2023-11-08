import {
  ComponentProps,
  FormEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  Button,
  FormField,
  GearTrainIcon,
  GlobeIcon,
  Input,
  ListBoxItem,
  Select,
  Stepper,
  Switch,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import upperFirst from 'lodash/upperFirst'
import isEmpty from 'lodash/isEmpty'
import { SetNonNullable, SetRequired } from 'type-fest'
import { Link } from 'react-router-dom'

import {
  AddOnConfigConditionFragment,
  AddOnConfigurationFragment,
  ClusterAddOnFragment,
  ClusterTinyFragment,
  GlobalServiceAttributes,
  ServiceDeploymentsRowFragment,
  useClusterProvidersSuspenseQuery,
  useClustersTinySuspenseQuery,
  useInstallAddOnMutation,
} from 'generated/graphql'

import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { SetReqNonNull } from 'utils/SetReqNonNull'

import { useOpenTransition } from 'components/hooks/suspense/useOpenTransition'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { Body2P } from 'components/utils/typography/Text'

import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

import { OperationType } from 'components/repos/constants'

import ModalAlt from '../ModalAlt'
import { GlobalServiceFields } from '../services/GlobalServiceFields'
import { tagsToNameValue } from '../services/CreateGlobalService'

import { ClusterSelect } from './ClusterSelect'

enum FormState {
  Basic = 'initial',
  Global = 'global',
  Complete = 'complete',
}

const stepperSteps = [
  {
    key: FormState.Basic,
    stepTitle: <>Service props</>,
    IconComponent: GearTrainIcon,
  },
  {
    key: FormState.Global,
    stepTitle: <>Global service props</>,
    IconComponent: GlobeIcon,
  },
]

enum ConfigurationType {
  Select = 'select',
  Boolean = 'bool',
  String = 'string',
}

function conditionIsMet(
  condition: Nullable<AddOnConfigConditionFragment>,
  values: Record<string, string | number | boolean | undefined>
) {
  if (!condition || !condition.field || !condition.operation) {
    return true
  }
  const value = values[condition.field]

  switch (condition.operation.toUpperCase()) {
    case OperationType.NOT:
      return !value
    case OperationType.PREFIX:
      return (
        (typeof value === 'string' &&
          typeof condition?.value === 'string' &&
          value.startsWith(condition.value)) ??
        false
      )
    case OperationType.EQUAL:
      return value === condition.value
  }

  return true
}

export function parseToBool(val: boolean | string | undefined | null) {
  if (typeof val === 'boolean') {
    return val
  }
  let boolVal = false

  if (typeof val === 'string') {
    try {
      const jsonVal = JSON.parse(val.toLowerCase())

      if (typeof jsonVal === 'boolean') {
        boolVal = jsonVal
      }
    } catch {
      /* empty */
    }
  }

  return boolVal
}

function validateAndFilterConfig(
  config: Nullable<AddOnConfigurationFragment>[],
  configVals: Record<string, string | undefined>
) {
  const filteredValues: { name: string; value: string }[] = []
  const isValid = config.reduce((acc, configItem) => {
    const conditionMet = conditionIsMet(configItem?.condition, configVals)
    const name = configItem?.name

    if (conditionMet && name) {
      let value = configVals[name]

      if (configItem.type === ConfigurationType.Boolean) {
        value = parseToBool(value).toString()
      }

      if (value) {
        filteredValues.push({ name, value })
      }

      return !!value && acc
    }

    return acc
  }, true)

  return { isValid, values: filteredValues }
}

export function InstallAddOn({
  addOn,
}: {
  addOn: Nullable<ClusterAddOnFragment>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { buttonProps } = useOpenTransition(isOpen, setIsOpen)

  if (!addOn?.name) {
    return null
  }

  return (
    <>
      <Button
        small
        secondary
        {...buttonProps}
      >
        Install
      </Button>
      <ModalMountTransition open={isOpen}>
        <InstallAddOnModal
          addOn={addOn as SetReqNonNull<typeof addOn, 'name'>}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}

export function InstallAddOnModal({
  addOn,
  open,
  onClose,
}: {
  addOn: SetReqNonNull<ClusterAddOnFragment, 'name'>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [formState, setFormState] = useState(FormState.Basic)
  const [serviceDeployment, setServiceDeployment] =
    useState<Nullable<ServiceDeploymentsRowFragment>>()
  const configuration = useMemo(
    () =>
      addOn?.configuration?.filter(
        (
          a
        ): a is SetRequired<
          SetNonNullable<AddOnConfigurationFragment, 'name'>,
          'name'
        > => !!a?.name
      ) || [],
    [addOn?.configuration]
  )

  // Initial form variables
  const [configVals, setConfigVals] = useState(
    Object.fromEntries(configuration.map((cfg) => [cfg?.name, '']))
  )
  const [clusterId, setClusterId] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)

  const { isValid: configIsValid, values: filteredConfiguration } = useMemo(
    () => validateAndFilterConfig(configuration, configVals),
    [configVals, configuration]
  )

  // Global form variables
  const [globalName, setGlobalName] = useState('')
  const [globalTags, setGlobalTags] = useState<Record<string, string>>({})
  const [providerId, setClusterProviderId] = useState('')

  const { data } = useClustersTinySuspenseQuery({
    fetchPolicy: 'cache-and-network',
  })
  const { data: providersData } = useClusterProvidersSuspenseQuery({
    fetchPolicy: 'cache-and-network',
  })
  const clusterProviders = useMemo(
    () => [
      ...(providersData?.clusterProviders?.edges
        ?.map((edge) => edge?.node)
        .filter(isNonNullable) ?? []),
      {
        id: '',
        cloud: '',
        name: 'All providers',
        icon: <GlobeIcon color={theme.colors['icon-xlight']} />,
      },
    ],
    [providersData?.clusterProviders?.edges, theme.colors]
  )
  const globalProps = useMemo<GlobalServiceAttributes>(
    () => ({
      name: globalName,
      tags: tagsToNameValue(globalTags),
      providerId,
    }),
    [providerId, globalName, globalTags]
  )

  const [mutation, { loading, error }] = useInstallAddOnMutation({
    variables: {
      clusterId,
      name: addOn.name,
      configuration: filteredConfiguration,
      ...(isGlobal ? { global: globalProps } : {}),
    },
    onCompleted: (result) => {
      if (result.installAddOn) {
        setServiceDeployment(result.installAddOn)
        setFormState(FormState.Complete)
      }
    },
  })
  const closeModal = useCallback(() => {
    onClose?.()
  }, [onClose])

  const isSubmitStep = isGlobal
    ? formState === FormState.Global
    : formState === FormState.Basic

  const initialPropsComplete = addOn.name && clusterId && configIsValid
  const globalPropsComplete = globalProps.name

  const allowSubmit =
    formState === FormState.Basic
      ? initialPropsComplete
      : initialPropsComplete && globalPropsComplete

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (formState === FormState.Complete) {
        closeModal()
      }
      if (!allowSubmit) {
        return
      }
      if (isGlobal && formState === FormState.Basic) {
        setFormState(FormState.Global)

        return
      }
      mutation()
    },
    [isGlobal, allowSubmit, closeModal, formState, mutation]
  )
  const clusters = useMemo(
    () => mapExistingNodes(data.clusters),
    [data.clusters]
  )

  return (
    <ModalAlt
      header={`Install add-on – ${addOn?.name}`}
      open={open}
      portal
      onClose={closeModal}
      asForm
      formProps={{ onSubmit }}
      actions={
        formState !== FormState.Complete ? (
          <>
            <Button
              type="submit"
              disabled={!allowSubmit}
              loading={loading}
              primary
            >
              {isSubmitStep ? 'Install' : 'Set global props'}
            </Button>
            {formState === FormState.Global && (
              <Button
                type="button"
                secondary
                onClick={() => {
                  setFormState(FormState.Basic)
                }}
              >
                Go back
              </Button>
            )}
            <Button
              type="button"
              secondary
              onClick={closeModal}
            >
              Cancel
            </Button>
            {addOn.global && formState === FormState.Basic && (
              <div css={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <Switch
                  onChange={(checked) => {
                    setIsGlobal(checked)
                  }}
                  checked={isGlobal}
                  css={{ width: 'fit-content' }}
                >
                  Make global
                </Switch>
              </div>
            )}
          </>
        ) : (
          <Button
            type="button"
            secondary
            onClick={closeModal}
          >
            Close
          </Button>
        )
      }
    >
      {addOn?.global && (
        <div
          css={{
            display: 'flex',
            paddingBottom: theme.spacing.medium,
          }}
        >
          <Stepper
            compact
            steps={isGlobal ? stepperSteps : [stepperSteps[0]]}
            stepIndex={
              formState === FormState.Basic
                ? 0
                : formState === FormState.Global
                ? 1
                : formState === FormState.Complete
                ? 2
                : 1
            }
          />
        </div>
      )}
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        {formState === FormState.Basic ? (
          <InitialSettings
            {...{
              clusters,
              clusterId,
              setClusterId,
              configuration,
              configVals,
              setConfigVals,
            }}
          />
        ) : formState === FormState.Global ? (
          <GlobalSettings
            {...{
              name: globalName,
              setName: setGlobalName,
              setTags: setGlobalTags,
              tags: globalTags,
              clusterProviderId: providerId,
              setClusterProviderId,
              clusterProviders,
            }}
          />
        ) : formState === FormState.Complete ? (
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.small,
            }}
          >
            <Body2P>Successfully installed {addOn.name}.</Body2P>
            <Body2P>
              <InlineLink
                as={Link}
                to={getServiceDetailsPath({
                  clusterId: serviceDeployment?.cluster?.id,
                  serviceId: serviceDeployment?.id,
                })}
              >
                See details
              </InlineLink>{' '}
              or view{' '}
              <InlineLink
                as={Link}
                to="/cd/services"
              >
                all services
              </InlineLink>
              .
            </Body2P>
          </div>
        ) : null}
      </div>
      {formState !== FormState.Complete && error && (
        <GqlError
          header="Problem installing add-on"
          error={error}
        />
      )}
    </ModalAlt>
  )
}

function GlobalSettings(props: ComponentProps<typeof GlobalServiceFields>) {
  return <GlobalServiceFields {...props} />
}

function InitialSettings({
  clusters,
  clusterId,
  setClusterId,
  configuration,
  configVals,
  setConfigVals,
}: {
  clusters: ClusterTinyFragment[]
  clusterId: string
  setClusterId: (string) => void
  configuration: AddOnConfigurationFragment[]
  configVals: Record<string, string>
  setConfigVals: (vals: Record<string, string>) => void
}) {
  return (
    <>
      <ClusterSelect
        label="Select cluster"
        clusters={clusters}
        selectedKey={clusterId}
        onSelectionChange={(key) => setClusterId(key as string)}
      />
      {configuration.map((cfg) => {
        const { name, documentation, type, values } = cfg

        if (!name || !conditionIsMet(cfg?.condition, configVals)) {
          return null
        }
        const setValue = (value: string) => {
          setConfigVals({ ...configVals, [name]: value })
        }

        const configStringVal = configVals[name] || ''
        let configBoolVal = false

        if (type === ConfigurationType.Boolean) {
          configBoolVal = parseToBool(configStringVal)
        }

        return (
          <FormField
            required
            label={name}
            hint={upperFirst(documentation || '')}
          >
            {type === ConfigurationType.Boolean ? (
              <Switch
                checked={!!configBoolVal}
                onChange={(isChecked) => {
                  setValue(isChecked.toString())
                }}
              />
            ) : type === ConfigurationType.Select && !isEmpty(values) ? (
              <Select
                label={`Select ${name}`}
                selectedKey={configStringVal}
                onSelectionChange={(key) => {
                  setValue(key as string)
                }}
              >
                {values?.map((value) => (
                  <ListBoxItem
                    key={value as string}
                    label={value}
                  />
                )) || []}
              </Select>
            ) : (
              <Input
                value={configStringVal}
                onChange={(e) => {
                  setValue(e.currentTarget.value)
                }}
              />
            )}
          </FormField>
        )
      })}
    </>
  )
}
