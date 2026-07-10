import { Button, Card, FormField, Input, Switch } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { StackType, useUpdateStackMutation } from '../../../generated/graphql'
import { isTerraformFamilyStackType } from '../common/stackTypeUtils'
import { GqlError } from '../../utils/Alert'
import { OverlineH1 } from '../../utils/typography/Text'

import { StackOutletContextT } from '../Stacks'

export default function StackConfiguration() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack, refetch } = useOutletContext() as StackOutletContextT
  const isTerragrunt = stack.type === StackType.Terragrunt
  const isPulumi = stack.type === StackType.Pulumi
  const terraformConfig = stack.configuration.terraform
  const terragruntConfig = stack.configuration.terragrunt
  const pulumiConfig = stack.configuration.pulumi
  const [image, setImage] = useState(stack.configuration.image)
  const [version, setVersion] = useState(stack.configuration.version)
  const [parallelism, setParallelism] = useState(
    isTerraformFamilyStackType(stack.type)
      ? isTerragrunt
        ? terragruntConfig?.parallelism
        : terraformConfig?.parallelism
      : null
  )
  const [parallel, setParallel] = useState(pulumiConfig?.parallel ?? null)
  const [pulumiStack, setPulumiStack] = useState(pulumiConfig?.stack ?? '')
  const [backendUrl, setBackendUrl] = useState(pulumiConfig?.backendUrl ?? '')
  const [refresh, setRefresh] = useState(
    isTerragrunt
      ? terragruntConfig?.refresh
      : isPulumi
        ? pulumiConfig?.refresh
        : terraformConfig?.refresh
  )

  const changed =
    image !== stack.configuration.image ||
    version !== stack.configuration.version ||
    (isTerraformFamilyStackType(stack.type) &&
      parallelism !==
        (isTerragrunt
          ? terragruntConfig?.parallelism
          : terraformConfig?.parallelism)) ||
    (isPulumi && parallel !== pulumiConfig?.parallel) ||
    (isPulumi && pulumiStack !== (pulumiConfig?.stack ?? '')) ||
    (isPulumi && backendUrl !== (pulumiConfig?.backendUrl ?? '')) ||
    refresh !==
      (isTerragrunt
        ? terragruntConfig?.refresh
        : isPulumi
          ? pulumiConfig?.refresh
          : terraformConfig?.refresh)

  const [mutation, { loading, error }] = useUpdateStackMutation({
    variables: {
      id: stackId,
      attributes: {
        name: stack.name,
        type: stack.type,
        clusterId: stack.cluster?.id ?? '',
        repositoryId: stack.repository?.id ?? '',
        git: { folder: stack.git.folder, ref: stack.git.ref },
        configuration: {
          image,
          version,
          ...(isTerragrunt
            ? { terragrunt: { refresh, parallelism } }
            : isPulumi
              ? {
                  pulumi: {
                    refresh,
                    parallel,
                    stack: pulumiStack || null,
                    backendUrl: backendUrl || null,
                  },
                }
              : isTerraformFamilyStackType(stack.type)
                ? { terraform: { refresh, parallelism } }
                : {}),
        },
      },
    },
    onCompleted: () => refetch?.(),
  })

  if (!stack) {
    return <LoadingIndicator />
  }

  return (
    <Card css={{ padding: theme.spacing.large }}>
      <OverlineH1
        as="h3"
        css={{
          color: theme.colors['text-xlight'],
          marginBottom: theme.spacing.large,
        }}
      >
        Configuration
      </OverlineH1>
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: theme.spacing.medium,
          marginBottom: theme.spacing.large,
          alignItems: 'center',
        }}
      >
        <FormField label="Image">
          <Input
            value={image}
            placeholder="Enter image"
            onChange={(e) => setImage(e.currentTarget.value)}
          />
        </FormField>
        <FormField
          label="Version"
          required
        >
          <Input
            value={version}
            placeholder="Enter image version"
            onChange={(e) => setVersion(e.currentTarget.value)}
          />
        </FormField>
        {(isTerraformFamilyStackType(stack.type) || isPulumi) && (
          <FormField label="Refresh">
            <div
              css={{
                display: 'flex',
                gap: theme.spacing.small,
                alignItems: 'center',
                height: '38px',
              }}
            >
              <span>Off</span>
              <Switch
                checked={refresh ?? false}
                onChange={(checked) => setRefresh(checked)}
                css={{ gap: 0 }}
              />
              <span>On</span>
            </div>
          </FormField>
        )}
        {isTerraformFamilyStackType(stack.type) && (
          <FormField label="Parallelism">
            <Input
              value={parallelism?.toString() ?? ''}
              placeholder="Enter integer"
              onChange={(e) => {
                const value = e.currentTarget.value.replace(/[^0-9]/g, '')
                setParallelism(value === '' ? null : parseInt(value, 10))
              }}
            />
          </FormField>
        )}
        {isPulumi && (
          <FormField label="Parallel">
            <Input
              value={parallel?.toString() ?? ''}
              placeholder="Enter integer"
              onChange={(e) => {
                const value = e.currentTarget.value.replace(/[^0-9]/g, '')
                setParallel(value === '' ? null : parseInt(value, 10))
              }}
            />
          </FormField>
        )}
        {isPulumi && (
          <FormField label="Stack">
            <Input
              value={pulumiStack}
              placeholder="dev"
              onChange={(e) => setPulumiStack(e.currentTarget.value)}
            />
          </FormField>
        )}
        {isPulumi && (
          <FormField label="Backend URL">
            <Input
              value={backendUrl}
              placeholder="Pulumi Cloud (default), s3://bucket, or https://..."
              onChange={(e) => setBackendUrl(e.currentTarget.value)}
            />
          </FormField>
        )}
      </div>
      {error && <GqlError error={error} />}
      <div
        css={{
          ...theme.partials.text.body2,
          color: theme.colors['text-xlight'],
          alignItems: 'center',
          display: 'flex',
          gap: theme.spacing.medium,
          justifyContent: 'flex-end',
          marginTop: theme.spacing.small,
        }}
      >
        {changed && 'Unsaved changes'}
        <Button
          disabled={!changed}
          onClick={() => mutation()}
          loading={loading}
        >
          Save
        </Button>
      </div>
    </Card>
  )
}
