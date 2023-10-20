import { Button, FormField, Modal, PersonIcon } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { FormEvent, useCallback, useState } from 'react'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { StepBody } from '../ModalAlt'

const Overline = styled.h3(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))

const PermissionsColumnSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  rowGap: theme.spacing.medium,
}))

function ReadPermissions() {
  return (
    <PermissionsColumnSC>
      <Overline>Read Permissions</Overline>
      <FormField label="User Bindings">placeholder</FormField>
      <FormField label="Group Bindings">placeholder</FormField>
    </PermissionsColumnSC>
  )
}
function WritePermissions() {
  return (
    <PermissionsColumnSC>
      <Overline>Write Permissions</Overline>
      <FormField label="User Bindings">placeholder</FormField>
      <FormField label="Group Bindings">placeholder</FormField>
    </PermissionsColumnSC>
  )
}

export function ClusterPermissionsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const allowSubmit = false
  const mutationLoading = false

  const onSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()

    console.log('Submit form')
  }, [])

  return (
    <Modal
      header="Cluster permissions"
      open={open}
      onClose={onClose}
      asForm={false}
      portal
      size="large"
      maxWidth={1024}
      width={1024}
    >
      <form
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.xlarge,
        }}
        onSubmit={onSubmit}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            rowGap: theme.spacing.medium,
          }}
        >
          <StepBody>
            Bind users to read or write permissions for this cluster
          </StepBody>
        </div>
        <div css={{ display: 'flex' }}>
          <div
            css={{
              width: '50%',
              paddingRight: theme.spacing.large,
              borderRight: theme.borders['fill-two'],
            }}
          >
            <ReadPermissions />
          </div>
          <div css={{ width: '50%', paddingLeft: theme.spacing.large }}>
            <WritePermissions />
          </div>
        </div>
        <div
          css={{
            display: 'flex',
            columnGap: theme.spacing.medium,
            flexDirection: 'row-reverse',
          }}
        >
          <Button
            type="submit"
            disabled={!allowSubmit}
            loading={mutationLoading}
            primary
          >
            Save
          </Button>
          <Button
            secondary
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onClose?.()
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ClusterPermissions() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        secondary
        startIcon={<PersonIcon />}
        onClick={() => setIsOpen(true)}
      >
        Permissions
      </Button>
      <ModalMountTransition open={isOpen}>
        <ClusterPermissionsModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
