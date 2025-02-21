import {
  Flex,
  GearTrainIcon,
  IconFrame,
  PeopleIcon,
} from '@pluralsh/design-system'
import { LoginContext } from 'components/contexts'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import {
  Persona as PersonaT,
  PersonasDocument,
  useDeletePersonaMutation,
} from 'generated/graphql'
import { Button } from 'honorable'
import { useContext, useState } from 'react'

import { removeConnection, updateCache } from '../../../../utils/graphql'
import { hasRbac, Permissions } from '../misc'

import { EditPersonaAttributes } from './PersonaAttributesEdit'
import { EditPersonaBindings } from './PersonaBindingsEdit'
import PersonaView from './PersonaView'

export default function PersonaActions({ persona }: { persona: PersonaT }) {
  const { me } = useContext<any>(LoginContext)
  const editable = !!me.roles?.admin || hasRbac(me, Permissions.USERS)

  const [dialogKey, setDialogKey] = useState<
    'confirmDelete' | 'editAttrs' | 'editBindings' | 'viewPersona' | ''
  >('')

  const [mutation, { loading, error }] = useDeletePersonaMutation({
    variables: { id: persona.id },
    onCompleted: () => dialogKey === 'confirmDelete' && setDialogKey(''),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: PersonasDocument,
        update: (prev) =>
          removeConnection(prev, data?.deletePersona, 'personas'),
      }),
  })

  return (
    <Flex
      width="100%"
      alignItems="center"
    >
      {editable ? (
        <Flex gap="xsmall">
          <IconFrame
            clickable
            size="medium"
            onClick={() => dialogKey === '' && setDialogKey('editAttrs')}
            tooltip="Edit attributes"
            icon={<GearTrainIcon />}
          />
          <IconFrame
            clickable
            size="medium"
            onClick={() => setDialogKey('editBindings')}
            tooltip="Edit members"
            icon={<PeopleIcon />}
          />
          <DeleteIconButton onClick={() => setDialogKey('confirmDelete')} />
        </Flex>
      ) : (
        <Button
          secondary
          small
          onClick={() => dialogKey === '' && setDialogKey('viewPersona')}
        >
          View
        </Button>
      )}

      <PersonaView
        open={dialogKey === 'viewPersona'}
        onClose={() => dialogKey === 'viewPersona' && setDialogKey('')}
        persona={persona}
      />
      <EditPersonaAttributes
        persona={persona}
        open={dialogKey === 'editAttrs'}
        onClose={() => dialogKey === 'editAttrs' && setDialogKey('')}
      />
      <EditPersonaBindings
        persona={persona}
        open={dialogKey === 'editBindings'}
        onClose={() => dialogKey === 'editBindings' && setDialogKey('')}
      />
      <Confirm
        open={dialogKey === 'confirmDelete'}
        text={
          <>
            Are you sure you want to delete the <b>{persona.name}</b> persona?
            This could have downstream effects on a large number of users and
            their personas.
          </>
        }
        close={() => dialogKey === 'confirmDelete' && setDialogKey('')}
        label="Delete persona"
        submit={() => mutation()}
        loading={loading}
        destructive
        error={error}
      />
    </Flex>
  )
}
