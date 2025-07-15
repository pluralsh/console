import { Button, Card, FormField, Input, Switch } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { useUpdateStackMutation } from '../../../generated/graphql'
import { GqlError } from '../../utils/Alert'
import { OverlineH1 } from '../../utils/typography/Text'

import { StackOutletContextT } from '../Stacks'

export default function StackConfiguration() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack, refetch } = useOutletContext() as StackOutletContextT
  const [image, setImage] = useState(stack.configuration.image)
  const [version, setVersion] = useState(stack.configuration.version)
  const [parallelism, setParallelism] = useState(
    stack.configuration.terraform?.parallelism
  )
  const [refresh, setRefresh] = useState(stack.configuration.terraform?.refresh)

  const changed =
    image !== stack.configuration.image ||
    version !== stack.configuration.version ||
    parallelism !== stack.configuration.terraform?.parallelism ||
    refresh !== stack.configuration.terraform?.refresh

  const [mutation, { loading, error }] = useUpdateStackMutation({
    variables: {
      id: stackId,
      attributes: {
        name: stack.name,
        type: stack.type,
        clusterId: stack.cluster?.id ?? '',
        repositoryId: stack.repository?.id ?? '',
        git: { folder: stack.git.folder, ref: stack.git.ref },
        configuration: { image, version, terraform: { refresh, parallelism } },
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
