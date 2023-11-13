import {
  ComponentProps,
  FormEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'

import styled, { useTheme } from 'styled-components'
import { Button, GlobeIcon, ListBoxItemChipList } from '@pluralsh/design-system'

import {
  ServiceDeploymentsRowFragment,
  useClusterProvidersQuery,
  useCreateGlobalServiceMutation,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { isNonNullable } from 'utils/isNonNullable'

import ModalAlt, { StepBody, StepH } from '../ModalAlt'

import { GlobalServiceFields } from './GlobalServiceFields'

export const ChipList = styled(ListBoxItemChipList)(({ theme }) => ({
  marginTop: theme.spacing.small,
  justifyContent: 'start',
}))

export const validateTagName = (name) => {
  const splits = name.split('/')

  if (splits.length > 2) {
    return false
  }
  const key = splits.length === 1 ? splits[0] : splits[1]
  const prefix = splits.length === 1 ? splits[1] : null

  return (
    validateTagValue(key) &&
    key.length >= 1 &&
    (!prefix || (prefix.length <= 253 && !prefix.match(/[/s]/)))
  )
}

export const validateTagValue = (value) =>
  value === '' ||
  (!!value.match(/^[A-Za-z0-9]([-_.]*[A-Za-z0-9])*$/) && value.length <= 63)

export function tagsToNameValue<T>(tags: Record<string, T>) {
  return Object.entries(tags).map(([name, value]) => ({
    name,
    value,
  }))
}

export function CreateGlobalServiceModal({
  open,
  onClose,
  refetch,
  serviceDeployment,
}: {
  open: boolean
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
  serviceDeployment: ServiceDeploymentsRowFragment
}) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [tags, setTags] = useState<Record<string, string>>({})
  const [clusterProviderId, setClusterProviderId] = useState('')
  const nameValueTags = useMemo(() => tagsToNameValue(tags), [tags])

  const { data } = useClusterProvidersQuery()
  const clusterProviders = useMemo(
    () => [
      ...(data?.clusterProviders?.edges
        ?.map((edge) => edge?.node)
        .filter(isNonNullable) ?? []),
      {
        id: '',
        cloud: '',
        name: 'All providers',
        icon: <GlobeIcon color={theme.colors['icon-xlight']} />,
      },
    ],
    [data?.clusterProviders?.edges, theme.colors]
  )

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useCreateGlobalServiceMutation({
      variables: {
        serviceId: serviceDeployment.id,
        attributes: {
          name,
          tags: nameValueTags,
          ...(clusterProviderId ? { providerId: clusterProviderId } : {}),
        },
      },
      onCompleted: () => {
        refetch?.()
        onClose?.()
      },
    })

  const allowCreate = name && serviceDeployment.id

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (allowCreate) {
        mutation()
      }
    },
    [allowCreate, mutation]
  )

  const initialLoading = false

  return (
    <ModalAlt
      header="Create global service"
      open={open}
      portal
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          <Button
            type="submit"
            disabled={!allowCreate}
            loading={mutationLoading}
            primary
          >
            Create
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
        </>
      }
    >
      <div
        css={{
          paddingBottom: theme.spacing.large,
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
        }}
      >
        {initialLoading ? (
          <LoadingIndicator />
        ) : (
          <>
            <StepBody>
              Global services will be automatically replicated across clusters.
              Clusters will be selected based on the tags and provider specified
              (leave either blank if you don't want to filter on them).
            </StepBody>
            <StepBody>
              <StepH css={{ display: 'inline' }}>Service:</StepH>{' '}
              {serviceDeployment.name}
            </StepBody>
            <GlobalServiceFields
              {...{
                name,
                setName,
                setTags,
                tags,
                theme,
                clusterProviderId,
                setClusterProviderId,
                clusterProviders,
              }}
            />
          </>
        )}
      </div>
      {mutationError && <GqlError error={mutationError} />}
    </ModalAlt>
  )
}

export function CreateGlobalService(
  props: ComponentProps<typeof CreateGlobalServiceModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <CreateGlobalServiceModal {...props} />
    </ModalMountTransition>
  )
}
