import { GearTrainIcon, IconFrame, PeopleIcon } from '@pluralsh/design-system'
import { useContext, useState } from 'react'
import { Confirm } from 'components/utils/Confirm'
import { LoginContext } from 'components/contexts'
import { Button, Flex } from 'honorable'
import {
  Persona as PersonaT,
  PersonasDocument,
  useDeletePersonaMutation,
} from 'generated/graphql'
import { DeleteIconButton } from 'components/utils/IconButtons'

import { removeConnection, updateCache } from '../../../utils/graphql'
import { Info } from '../../utils/Info'
import { Permissions, hasRbac } from '../misc'

import { EditPersonaAttributes } from './PersonaEdit'
import PersonaView from './PersonaView'

export default function Persona({ persona }: { persona: PersonaT }) {
  const { me } = useContext<any>(LoginContext)
  const editable = !!me.roles?.admin || hasRbac(me, Permissions.USERS)
  const [dialogKey, setDialogKey] = useState<
    'confirmDelete' | 'editAttrs' | 'editMembers' | 'viewPersona' | ''
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
      flexDirection="row"
      alignItems="center"
    >
      <Info
        text={persona.name}
        description={persona.description || 'no description'}
      />
      <Flex
        flex={false}
        direction="row"
        gap="large"
        align="center"
      >
        {!editable && (
          <Button
            secondary
            small
            onClick={() => dialogKey === '' && setDialogKey('viewPersona')}
          >
            View
          </Button>
        )}
        {editable && (
          <Flex gap="xsmall">
            <>
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
                onClick={() => setDialogKey('editMembers')}
                tooltip="Edit members"
                icon={<PeopleIcon />}
              />
              <DeleteIconButton onClick={() => setDialogKey('confirmDelete')} />
            </>
          </Flex>
        )}
      </Flex>
      <>
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
        <EditPersonaAttributes
          persona={persona}
          open={dialogKey === 'editMembers'}
          onClose={() => dialogKey === 'editMembers' && setDialogKey('')}
        />
        <Confirm
          open={dialogKey === 'confirmDelete'}
          text={
            <>
              Are you sure you want to delete the <b>{persona.name}</b> persona?
              This could have downstream effects on a large number of users and
              their roles.
            </>
          }
          close={() => dialogKey === 'confirmDelete' && setDialogKey('')}
          label="Delete persona"
          submit={() => mutation()}
          loading={loading}
          destructive
          error={error}
        />
      </>
    </Flex>
  )
}
