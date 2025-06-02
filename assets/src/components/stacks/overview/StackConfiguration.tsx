import { Button, Card, FormField, Input } from '@pluralsh/design-system'
import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useTheme } from 'styled-components'

import { useUpdateStackMutation } from '../../../generated/graphql'
import { GqlError } from '../../utils/Alert'

import { StackOutletContextT } from '../Stacks'
import { OverlineH1 } from '../../utils/typography/Text'

export default function StackConfiguration() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack, refetch } = useOutletContext() as StackOutletContextT
  const [image, setImage] = useState(stack.configuration.image)
  const [version, setVersion] = useState(stack.configuration.version)

  const changed =
    image !== stack.configuration.image ||
    version !== stack.configuration.version

  const [mutation, { loading, error }] = useUpdateStackMutation({
    variables: {
      id: stackId,
      attributes: {
        name: stack.name,
        type: stack.type,
        clusterId: stack.cluster?.id ?? '',
        repositoryId: stack.repository?.id ?? '',
        git: { folder: stack.git.folder, ref: stack.git.ref },
        configuration: { image, version },
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
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
          marginBottom: theme.spacing.large,
        }}
      >
        <FormField label="Image">
          <Input
            value={image}
            onChange={(e) => setImage(e.currentTarget.value)}
          />
        </FormField>
        <FormField
          label="Version"
          required
        >
          <Input
            value={version}
            onChange={(e) => setVersion(e.currentTarget.value)}
          />
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
