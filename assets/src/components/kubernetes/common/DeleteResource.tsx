import { useMutation } from '@tanstack/react-query'
import {
  Checkbox,
  FormField,
  IconFrame,
  ListBoxItem,
  Select,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { ReactNode, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  deleteNamespacedResourceMutation,
  deleteResourceMutation,
} from '../../../generated/kubernetes/@tanstack/react-query.gen'
import { AxiosInstance } from '../../../helpers/axios'

import { Confirm, ConfirmProps } from '../../utils/Confirm'

import { Kind, Resource } from './types'

interface DeleteResourceProps {
  resource: Resource
  refetch?: Nullable<() => Promise<any>>
  customResource?: boolean
}

export default function DeleteResourceButton({
  resource,
  refetch,
  customResource = false,
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
          confirmationEnabled={
            customResource ||
            resource.typeMeta.kind === Kind.CustomResourceDefinition ||
            resource.typeMeta.kind === Kind.Namespace
          }
          confirmationText={resource.objectMeta.name}
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

interface ServerError {
  statusCode?: number
  result?: string
  message?: string
}

interface DeleteResourceModalProps
  extends Pick<ConfirmProps, 'confirmationEnabled' | 'confirmationText'> {
  open: boolean
  setOpen: (open: boolean) => void
  resource: Resource
  refetch?: Nullable<() => Promise<any>>
}

function DeleteResourceModal({
  open,
  setOpen,
  resource,
  refetch,
  ...modalProps
}: DeleteResourceModalProps): ReactNode {
  const theme = useTheme()
  const [deleting, setDeleting] = useState(false)
  const [deleteNow, setDeleteNow] = useState(false)
  const [serverError, setServerError] = useState<ServerError>()
  const [propagation, setPropagation] = useState(
    DeletionPropagation.DeletePropagationBackground
  )
  const { clusterId } = useParams()
  const name = resource?.objectMeta?.name ?? ''
  const namespace = resource?.objectMeta?.namespace ?? ''
  const kind = resource?.typeMeta?.kind ?? ''
  const client = AxiosInstance(clusterId ?? '')

  const namespacedMutation = useMutation({
    ...deleteNamespacedResourceMutation(),
    onSuccess: () => {
      if (refetch) {
        refetch()
          .then(() => setOpen(false))
          .finally(() => setDeleting(false))
      } else {
        setDeleting(false)
        setOpen(false)
      }
    },
    onError: (error: any) => {
      setDeleting(false)
      setServerError({
        statusCode: error.response?.status,
        result: error.response?.data?.message || error.message,
      })
    },
  })

  const clusterMutation = useMutation({
    ...deleteResourceMutation(),
    onSuccess: () => {
      if (refetch) {
        refetch()
          .then(() => setOpen(false))
          .finally(() => setDeleting(false))
      } else {
        setDeleting(false)
        setOpen(false)
      }
    },
    onError: (error: any) => {
      setDeleting(false)
      setServerError({
        statusCode: error.response?.status,
        result: error.response?.data?.message || error.message,
      })
    },
  })

  const mutation = namespace ? namespacedMutation : clusterMutation

  return (
    <Confirm
      close={() => setOpen(false)}
      destructive
      label="Delete"
      loading={deleting}
      error={mutation.error}
      errorMessage={
        serverError?.result?.toString() ?? 'Could not delete resource'
      }
      errorHeader="Something went wrong"
      open={open}
      submit={() => {
        setDeleting(true)
        if (namespace) {
          namespacedMutation.mutate({
            client,
            path: { kind, name, namespace },
            query: {
              propagation,
              deleteNow: `${deleteNow}`,
            },
          })
        } else {
          clusterMutation.mutate({
            client,
            path: { kind, name },
            query: {
              propagation,
              deleteNow: `${deleteNow}`,
            },
          })
        }
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
      {...modalProps}
    />
  )
}
