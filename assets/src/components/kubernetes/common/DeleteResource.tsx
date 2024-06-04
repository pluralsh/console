import { ReactNode, useMemo, useState } from 'react'
import {
  Checkbox,
  FormField,
  IconFrame,
  ListBoxItem,
  Select,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'
import { QueryHookOptions } from '@apollo/client/react/types/types'
import { useTheme } from 'styled-components'

import { Confirm } from '../../utils/Confirm'
import {
  useNamespacedResourceDeleteMutation,
  useResourceDeleteMutation,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'

import { Resource } from './types'

interface DeleteResourceProps {
  resource: Resource
  refetch?: Nullable<
    (variables?: Partial<QueryHookOptions>) => Promise<unknown> | void
  >
}

export default function DeleteResourceButton({
  resource,
  refetch,
}: DeleteResourceProps): ReactNode {
  const [open, setOpen] = useState(false)

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <IconFrame
        clickable
        icon={<TrashCanIcon color="icon-danger" />}
        onClick={() => setOpen(true)}
        textValue="Delete"
        tooltip
      />
      {open && (
        <DeleteResourceModal
          open={open}
          setOpen={setOpen}
          resource={resource}
          refetch={refetch}
        />
      )}
    </div>
  )
}

enum DeletionPropagation {
  DeletePropagationBackground = 'Background',
  DeletePropagationForeground = 'Foreground',
  DeletePropagationOrphan = 'Orphan',
}

function DeleteResourceModal({ open, setOpen, resource, refetch }): ReactNode {
  const theme = useTheme()
  const [deleting, setDeleting] = useState(false)
  const [deleteNow, setDeleteNow] = useState(false)
  const [propagation, setPropagation] = useState(
    DeletionPropagation.DeletePropagationBackground
  )
  const { clusterId } = useParams()
  const name = resource?.objectMeta?.name ?? ''
  const namespace = resource?.objectMeta?.namespace ?? ''
  const kind = resource?.typeMeta?.kind ?? ''
  const deleteMutation = useMemo(
    () =>
      namespace
        ? useNamespacedResourceDeleteMutation
        : useResourceDeleteMutation,
    [namespace]
  )

  const [deleteResource, { error }] = deleteMutation({
    client: KubernetesClient(clusterId ?? ''),
    variables: {
      name,
      namespace,
      kind,
      propagation,
      deleteNow: `${deleteNow}`,
    },
    onError: () => setDeleting(false),
    onCompleted: () =>
      refetch?.({
        fetchPolicy: 'no-cache',
      })
        .then(() => setOpen(false))
        .finally(() => setDeleting(false)),
  })

  return (
    <Confirm
      close={() => setOpen(false)}
      destructive
      label="Delete"
      loading={deleting}
      error={error}
      errorMessage="Could not delete resource"
      errorHeader="Something went wrong"
      open={open}
      submit={() => {
        setDeleting(true)
        deleteResource()
      }}
      title={`Delete ${kind}`}
      text={`The ${kind} "${name}"${
        namespace ? ` in namespace "${namespace}"` : ''
      } will be deleted.`}
      extraContent={
        <div
          css={{
            paddingTop: theme.spacing.medium,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
          }}
        >
          <FormField label="Propagation policy">
            <Select
              selectedKey={propagation}
              onSelectionChange={(key) =>
                setPropagation(key as DeletionPropagation)
              }
            >
              {Object.values(DeletionPropagation).map((d) => (
                <ListBoxItem
                  key={d}
                  label={d}
                />
              ))}
            </Select>
          </FormField>
          <Checkbox
            checked={deleteNow}
            onChange={(e) => setDeleteNow(e.target.checked)}
          >
            Delete now (sets delete grace period to 1 second)
          </Checkbox>
        </div>
      }
    />
  )
}
