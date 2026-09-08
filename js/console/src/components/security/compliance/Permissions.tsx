import {
  Button,
  Flex,
  IconFrame,
  Modal,
  PeopleIcon,
} from '@pluralsh/design-system'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import {
  ComplianceReportGeneratorFragment,
  useUpsertComplianceReportGeneratorMutation,
} from '../../../generated/graphql.ts'

import uniqWith from 'lodash/uniqWith'
import isEqual from 'lodash/isEqual'
import { isNonNullable } from '../../../utils/isNonNullable.ts'
import { GqlError } from '../../utils/Alert.tsx'
import {
  bindingToBindingAttributes,
  FormBindings,
} from 'components/utils/bindings.tsx'

export function PermissionsModal({
  generator,
  open,
  onClose,
}: {
  generator: ComplianceReportGeneratorFragment
  open: boolean
  onClose: Nullable<() => void>
}) {
  const [bindings, setBindings] = useState(generator.readBindings)

  useEffect(() => setBindings(generator.readBindings), [generator.readBindings])

  const uniqueBindings = useMemo(() => uniqWith(bindings, isEqual), [bindings])

  const [mutation, { loading, error }] =
    useUpsertComplianceReportGeneratorMutation({
      onCompleted: () => {
        onClose?.()
      },
    })

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (bindings) {
        mutation({
          variables: {
            attributes: {
              name: generator.name,
              format: generator.format,
              readBindings: bindings
                ?.filter(isNonNullable)
                .map(bindingToBindingAttributes),
            },
          },
        })
      }
    },
    [bindings, generator.name, generator.format, mutation]
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={'large'}
      asForm
      formProps={{ onSubmit }}
      header={
        <Flex
          align={'center'}
          justify={'space-between'}
        >
          Permissions
          <Flex gap={'small'}>
            <Button
              type={'button'}
              secondary
              small
              onClick={() => onClose?.()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              small
              primary
            >
              Save
            </Button>
          </Flex>
        </Flex>
      }
      css={{ maxHeight: '75vh' }}
    >
      <Flex
        gap={'medium'}
        direction={'column'}
      >
        <FormBindings
          bindings={uniqueBindings}
          setBindings={setBindings}
        />
        {error && <GqlError error={error} />}
      </Flex>
    </Modal>
  )
}

export function Permissions({
  generator,
}: {
  generator: ComplianceReportGeneratorFragment
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        tooltip={'Manage permissions'}
        clickable
        onClick={() => setOpen(true)}
        icon={<PeopleIcon />}
        type={'floating'}
      />
      <ModalMountTransition open={open}>
        <PermissionsModal
          generator={generator}
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
