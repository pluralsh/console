import {
  Button,
  Flex,
  FormField,
  Input2,
  Modal,
  ValidatedInput,
} from '@pluralsh/design-system'
import { RequiredDeep } from 'type-fest'

import {
  PersonaConfigurationAttributes,
  PersonaFragment,
  useUpdatePersonaMutation,
} from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { Body2P } from 'components/utils/typography/Text'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { PersonaConfiguration } from './PersonaConfiguration'

import { mergeWith } from 'lodash'
import {
  ComponentProps,
  FormEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import { deepOmitKey } from 'utils/deepOmitKey'

const BASE_CONFIGURATION: PersonaConfigurationAttributes = {
  all: false,
  home: {
    manager: false,
    security: false,
  },
  deployments: {
    addOns: false,
    clusters: false,
    deployments: false,
    pipelines: false,
    providers: false,
    repositories: false,
    services: false,
  },
  sidebar: {
    audits: false,
    kubernetes: false,
    pullRequests: false,
    settings: false,
    stacks: true,
    backups: true,
  },
} satisfies RequiredDeep<PersonaConfigurationAttributes>

export function PersonaAttributes({
  name,
  setName,
  description,
  setDescription,
  configuration,
  setConfiguration,
}: {
  name: string
  setName?: (name: string) => void
  description: string
  setDescription?: (description: string) => void
  configuration: PersonaConfigurationAttributes
  setConfiguration?: (configuration: PersonaConfigurationAttributes) => void
}) {
  const theme = useTheme()
  const viewOnly = !setDescription || !setName || !setConfiguration

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <FormField
        required={!viewOnly}
        label="Name"
      >
        {viewOnly ? (
          <Body2P css={{ color: theme.colors['text-light'] }}>{name}</Body2P>
        ) : (
          <Input2
            disabled={viewOnly}
            value={name}
            onChange={({ target: { value } }) => setName?.(value || '')}
          />
        )}
      </FormField>
      <FormField label="Description">
        {viewOnly ? (
          <Body2P css={{ color: theme.colors['text-light'] }}>
            {description}
          </Body2P>
        ) : (
          <Input2
            value={description}
            disabled={viewOnly}
            onChange={({ target: { value } }) => setDescription?.(value || '')}
          />
        )}
      </FormField>
      <div>
        <PersonaConfiguration
          configuration={configuration}
          setConfiguration={setConfiguration}
        />
      </div>
    </div>
  )
}

export function getFullConfig(
  configuration: Nullable<Partial<PersonaConfigurationAttributes>>
) {
  return mergeWith(
    {},
    BASE_CONFIGURATION,
    (deepOmitKey(configuration, '__typename' as const) || {
      all: true,
    }) as PersonaConfigurationAttributes,
    (base, src) => {
      if (!src) return base

      return src
    }
  )
}

export function EditPersonaAttributesModal({
  persona,
  open,
  onClose,
}: {
  persona: PersonaFragment
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const [errorMsg, setErrorMsg] = useState<ReactNode>()
  const initialConfig = useMemo(
    () => getFullConfig(persona?.configuration),
    [persona?.configuration]
  )

  const {
    state: formState,
    update,
    hasUpdates,
  } = useUpdateState({
    name: persona.name,
    description: persona.description,
    configuration: initialConfig,
  })

  const { name, description, configuration } = formState

  const [mutation, { loading, error }] = useUpdatePersonaMutation({
    variables: {
      id: persona.id,
      attributes: {
        name,
        description,
        configuration: configuration.all
          ? { all: true, deployments: null, sidebar: null }
          : configuration,
      },
    },
    onCompleted: onClose,
  })

  useEffect(() => {
    setErrorMsg(
      error && (
        <GqlError
          header="Problem editing persona attributes"
          error={error}
        />
      )
    )
  }, [error])

  const allowSubmit = hasUpdates && !!name

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault()
      if (allowSubmit) {
        mutation()
      }
    },
    [allowSubmit, mutation]
  )

  return (
    <Modal
      header={<>Edit attributes of ‘{persona.name}’</>}
      open={open}
      size="large"
      asForm
      formProps={{ onSubmit }}
      onClose={onClose}
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.medium,
          }}
        >
          <Button
            disabled={!allowSubmit}
            loading={loading}
            type="submit"
          >
            Update
          </Button>
          <Button
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Flex
        flexDirection="column"
        gap="large"
      >
        {errorMsg}
        <ValidatedInput
          label="Name"
          value={name}
          onChange={({ target: { value } }) => update({ name: value })}
        />
        <ValidatedInput
          label="Description"
          value={description}
          onChange={({ target: { value } }) => update({ description: value })}
        />
        <PersonaConfiguration
          configuration={formState.configuration}
          setConfiguration={(cfg: PersonaConfigurationAttributes) =>
            update({ configuration: cfg })
          }
        />
      </Flex>
    </Modal>
  )
}

export function EditPersonaAttributes(
  props: ComponentProps<typeof EditPersonaAttributesModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <EditPersonaAttributesModal {...props} />
    </ModalMountTransition>
  )
}
