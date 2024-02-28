import { Modal, ValidatedInput } from '@pluralsh/design-system'
import { ComponentProps, ReactNode, useEffect, useMemo, useState } from 'react'
import { Flex } from 'honorable'

import { Actions } from 'components/utils/Actions'

import { useUpdateState } from 'components/hooks/useUpdateState'

import {
  PersonaConfigurationAttributes,
  PersonaFragment,
  useUpdatePersonaMutation,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import mergeWith from 'lodash/mergeWith'

import { RequiredDeep } from 'type-fest'

import { GqlError } from '../../utils/Alert'

import { deepOmitKey } from './deepOmitKey'
import { PersonaConfigurationEdit } from './PersonaConfigurationEdit'

const BASE_CONFIGURATION = {
  all: false,
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

export function EditPersonaAttributesModal({
  persona,
  open,
  onClose,
}: {
  persona: PersonaFragment
  open: boolean
  onClose: () => void
}) {
  const [errorMsg, setErrorMsg] = useState<ReactNode>()
  const initialConfig = useMemo(
    () =>
      mergeWith(
        {},
        BASE_CONFIGURATION,
        (deepOmitKey(persona?.configuration, '__typename' as const) || {
          all: true,
        }) as PersonaConfigurationAttributes,
        (base, src) => {
          if (!src) return base

          return src
        }
      ),
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

  return (
    <Modal
      header={<>Edit attributes of ‘{persona.name}’</>}
      portal
      open={open}
      size="large"
      onClose={onClose}
      actions={
        <Actions
          cancel={onClose}
          submit={hasUpdates ? () => mutation() : undefined}
          loading={loading}
          action="Update"
        />
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
        <PersonaConfigurationEdit
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
