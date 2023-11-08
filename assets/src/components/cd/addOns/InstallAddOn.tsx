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
  Stepper,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import upperFirst from 'lodash/upperFirst'
import {
  AddOnConfigurationFragment,
  ClusterAddOnFragment,
  ClusterTinyFragment,
  GlobalServiceAttributes,
  ServiceDeploymentsRowFragment,
  useClusterProvidersSuspenseQuery,
  useClustersTinySuspenseQuery,
  useInstallAddOnMutation,
} from 'generated/graphql'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { SetNonNullable, SetRequired } from 'type-fest'
import { GqlError } from 'components/utils/Alert'
import { mapExistingNodes } from 'utils/graphql'
import { useOpenTransition } from 'components/hooks/suspense/useOpenTransition'

import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

import { Link } from 'react-router-dom'

import { isNonNullable } from 'utils/isNonNullable'

import { SetReqNonNull } from 'utils/SetReqNonNull'

import { InlineLink } from 'components/utils/typography/InlineLink'

import { Body2P } from 'components/utils/typography/Text'

import ModalAlt from '../ModalAlt'

import { GlobalServiceFields } from '../services/GlobalServiceFields'

import { tagsToNameValue } from '../services/CreateGlobalService'

import { ClusterSelect } from './ClusterSelect'

enum FormState {
  Initial = 'initial',
  Global = 'global',
  Complete = 'complete',
}

const stepperSteps = [
  {
    key: FormState.Initial,
    stepTitle: <>Service props</>,
    IconComponent: GearTrainIcon,
  },
  {
    key: FormState.Global,
    stepTitle: <>Global service props</>,
    IconComponent: GlobeIcon,
  },
]

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
  const [formState, setFormState] = useState(FormState.Initial)
  const [serviceDeployment, setServiceDeployment] =
    useState<Nullable<ServiceDeploymentsRowFragment>>()
  const configuration =
    addOn?.configuration?.filter(
      (
        a
      ): a is SetRequired<
        SetNonNullable<AddOnConfigurationFragment, 'name'>,
        'name'
      > => !!a?.name
    ) || []

  // Initial form variables
  const [configVals, setConfigVals] = useState(
    Object.fromEntries(configuration.map((cfg) => [cfg?.name, '']))
  )
  const [clusterId, setClusterId] = useState('')

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
      configuration: Object.entries(configVals).map(([name, value]) => ({
        name,
        value,
      })),
      ...(addOn.global ? { global: globalProps } : {}),
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

  const isSubmitStep = addOn.global
    ? formState === FormState.Global
    : formState === FormState.Initial

  const initialPropsComplete = addOn.name && clusterId
  const globalPropsComplete = globalProps.name

  const allowSubmit =
    formState === FormState.Initial
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
      if (addOn.global && formState === FormState.Initial) {
        setFormState(FormState.Global)

        return
      }
      mutation()
    },
    [addOn.global, allowSubmit, closeModal, formState, mutation]
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
                  setFormState(FormState.Initial)
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
            steps={stepperSteps}
            stepIndex={
              formState === FormState.Initial
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
        {formState === FormState.Initial ? (
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
          <Body2P>
            Successfully installed {addOn.name}.{' '}
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
  // name,
  // setName,
  configuration,
  configVals,
  setConfigVals,
}: {
  clusters: ClusterTinyFragment[]
  clusterId: string
  setClusterId: (string) => void
  // name: string
  // setName: (string) => void
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
      {/* <FormField
        required
        label="Name"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
      </FormField> */}
      {configuration.map((cfg) => {
        const { name, documentation } = cfg

        return (
          name && (
            <FormField
              label={name}
              hint={upperFirst(documentation || '')}
            >
              <Input
                value={configVals[name]}
                onChange={(e) => {
                  setConfigVals({
                    ...configVals,
                    [name]: e.currentTarget.value,
                  })
                }}
              />
            </FormField>
          )
        )
      })}
    </>
  )
}
