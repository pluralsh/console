import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Permissions } from '../cd/utils/PermissionsModal.tsx'
import {
  CatalogFragment,
  UpsertCatalogMutationVariables,
  useUpsertCatalogMutation,
} from '../../generated/graphql.ts'
import { ModalMountTransition } from '../utils/ModalMountTransition.tsx'
import { useTheme } from 'styled-components'
import uniqWith from 'lodash/uniqWith'
import isEqual from 'lodash/isEqual'
import { isNonNullable } from '../../utils/isNonNullable.ts'
import { bindingToBindingAttributes } from '../settings/usermanagement/roles/misc.ts'
import { Button, Modal } from '@pluralsh/design-system'
import { StepBody } from '../cd/ModalAlt.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { GqlError } from '../utils/Alert.tsx'

export function CatalogPermissions({
  catalog,
  open,
  onClose,
  refetch,
}: {
  catalog: CatalogFragment
  open: boolean
  onClose: () => void
  refetch?: () => void
}) {
  return (
    <ModalMountTransition open={open}>
      <CatalogPermissionsModal
        catalog={catalog}
        refetch={refetch}
        open={open}
        onClose={onClose}
      />
    </ModalMountTransition>
  )
}

export function CatalogPermissionsModal({
  catalog,
  open,
  onClose,
  refetch,
}: {
  catalog: CatalogFragment
  open: boolean
  onClose: () => void
  refetch?: () => void
}) {
  const theme = useTheme()

  const [createBindings, setCreateBindings] = useState(catalog.createBindings)
  const [readBindings, setReadBindings] = useState(catalog.readBindings)
  const [writeBindings, setWriteBindings] = useState(catalog.writeBindings)

  useEffect(
    () => setCreateBindings(catalog.createBindings),
    [catalog.createBindings]
  )
  useEffect(() => setReadBindings(catalog.readBindings), [catalog.readBindings])
  useEffect(
    () => setWriteBindings(catalog.writeBindings),
    [catalog.writeBindings]
  )

  const uniqueCreateBindings = useMemo(
    () => uniqWith(createBindings, isEqual),
    [createBindings]
  )
  const uniqueReadBindings = useMemo(
    () => uniqWith(readBindings, isEqual),
    [readBindings]
  )
  const uniqueWriteBindings = useMemo(
    () => uniqWith(writeBindings, isEqual),
    [writeBindings]
  )

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useUpsertCatalogMutation({
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })
  const allowSubmit = readBindings && writeBindings

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (!allowSubmit) return

      mutation({
        variables: {
          attributes: {
            name: catalog.name,
            author: catalog.author ?? '',
            createBindings: createBindings
              ?.filter(isNonNullable)
              .map(bindingToBindingAttributes),
            readBindings: readBindings
              ?.filter(isNonNullable)
              .map(bindingToBindingAttributes),
            writeBindings: writeBindings
              ?.filter(isNonNullable)
              .map(bindingToBindingAttributes),
          },
        } satisfies UpsertCatalogMutationVariables,
      })
    },
    [
      allowSubmit,
      mutation,
      catalog.name,
      catalog.author,
      createBindings,
      readBindings,
      writeBindings,
    ]
  )

  return (
    <Modal
      header={`Catalog permissions - ${catalog.name}`}
      open={open}
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      size="custom"
      css={{ width: 1024, maxWidth: 1024 }}
      onOpenAutoFocus={(e) => {
        e.preventDefault()
      }}
      actions={
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
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.xlarge,
        }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            rowGap: theme.spacing.medium,
          }}
        >
          <StepBody>
            Bind users and groups to create, read or write permissions for
            <b> {catalog.name}</b> catalog
          </StepBody>
        </div>
        {!catalog ? (
          <LoadingIndicator />
        ) : (
          <div css={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div css={{ paddingRight: theme.spacing.large }}>
              <Permissions
                permissionType="create"
                forLabel="catalog"
                bindings={uniqueCreateBindings}
                setBindings={setCreateBindings}
              />
            </div>
            <div
              css={{
                borderLeft: theme.borders['fill-two'],
                borderRight: theme.borders['fill-two'],
                paddingLeft: theme.spacing.large,
                paddingRight: theme.spacing.large,
              }}
            >
              <Permissions
                permissionType="read"
                forLabel="catalog"
                bindings={uniqueReadBindings}
                setBindings={setReadBindings}
              />
            </div>
            <div css={{ paddingLeft: theme.spacing.large }}>
              <Permissions
                permissionType="write"
                forLabel="catalog"
                bindings={uniqueWriteBindings}
                setBindings={setWriteBindings}
              />
            </div>
          </div>
        )}
        {mutationError && <GqlError error={mutationError} />}
      </div>
    </Modal>
  )
}
