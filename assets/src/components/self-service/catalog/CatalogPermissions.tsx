import { Modal, Button } from '@pluralsh/design-system'
import { StepBody } from 'components/cd/ModalAlt'
import { bindingToBindingAttributes } from 'components/settings/usermanagement/roles/misc'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import {
  CatalogFragment,
  useUpsertCatalogMutation,
  UpsertCatalogMutationVariables,
} from 'generated/graphql'
import { uniqWith, isEqual } from 'lodash'
import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { Permissions } from 'components/cd/utils/PermissionsModal.tsx'

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

  const [mutation, { loading, error }] = useUpsertCatalogMutation({
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
            category: catalog.category,
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
      catalog,
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
            loading={loading}
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
        {error && <GqlError error={error} />}
      </div>
    </Modal>
  )
}
