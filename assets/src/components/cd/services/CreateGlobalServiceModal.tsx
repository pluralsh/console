import { FormEvent, useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { Button, FormField, GlobeIcon, Input } from '@pluralsh/design-system'
import {
  ServiceDeploymentsRowFragment,
  useClusterProvidersQuery,
  useCreateGlobalServiceMutation,
} from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { isNonNullable } from 'utils/isNonNullable'

import ModalAlt, { StepBody, StepH } from '../ModalAlt'
import { ClusterProviderSelect } from '../utils/ProviderSelect'

import { TagSelection } from './TagSelection'
import { tagsToNameValue } from './CreateGlobalService'

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
  const [providerId, setClusterProviderId] = useState('')
  const nameValueTags = useMemo(() => tagsToNameValue(tags), [tags])

  const { data } = useClusterProvidersQuery()
  const clusterProviders = [
    ...(data?.clusterProviders?.edges
      ?.map((edge) => edge?.node)
      .filter(isNonNullable) ?? []),
    {
      id: '',
      cloud: '',
      name: 'All providers',
      icon: <GlobeIcon color={theme.colors['icon-xlight']} />,
    },
  ]

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useCreateGlobalServiceMutation({
      variables: {
        serviceId: serviceDeployment.id,
        attributes: {
          name,
          tags: nameValueTags,
          ...(providerId ? { providerId } : {}),
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

  const globalServiceFields = (
    <>
      {' '}
      <FormField
        required
        label="Global service name"
      >
        <Input
          value={name}
          placeholder="Name"
          onChange={(e) => {
            setName(e.currentTarget.value)
          }}
        />
      </FormField>
      <FormField label="Cluster tags">
        <TagSelection
          {...{
            setTags,
            tags,
            theme,
          }}
        />
      </FormField>
      <FormField label="Cluster provider">
        <ClusterProviderSelect
          aria-label="Cluster provider"
          label="Select cluster provider"
          selectedKey={providerId}
          onSelectionChange={(key) => {
            setClusterProviderId(key)
          }}
          clusterProviders={clusterProviders}
        />
      </FormField>
    </>
  )

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
            {globalServiceFields}
          </>
        )}
      </div>
      {mutationError && <GqlError error={mutationError} />}
    </ModalAlt>
  )
}
