import { Button, Card, FormField } from '@pluralsh/design-system'
import isEqual from 'lodash/isEqual'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { useUpdateStackMutation } from '../../../generated/graphql.ts'
import { deepOmitKey } from '../../../utils/deepOmitKey.tsx'
import { tagsToNameValue } from '../../cd/services/CreateGlobalService.tsx'
import { TagSelection } from '../../cd/services/TagSelection.tsx'
import { useUpdateState } from '../../hooks/useUpdateState.tsx'
import { GqlError } from '../../utils/Alert.tsx'

import { OverlineH1 } from '../../utils/typography/Text'
import { StackOutletContextT } from '../Stacks'

export default function StackTags() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT
  const initialTags: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        stack?.tags
          ?.map((tag) => [tag?.name, tag?.value || ''])
          .filter((t) => !!t[0]) || []
      ),
    [stack?.tags]
  )

  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState(
    {
      tags: initialTags,
    },
    {
      tags: (a, b) => !isEqual(a, b),
    }
  )
  const [mutation, { loading, error }] = useUpdateStackMutation()

  if (!stack) {
    return null
  }
  const allowSubmit = hasUpdates

  return (
    <Card
      css={{
        padding: theme.spacing.large,
        gap: theme.spacing.medium,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <OverlineH1
        as="h3"
        css={{
          color: theme.colors['text-xlight'],
          marginBottom: theme.spacing.large,
        }}
      >
        Tags
      </OverlineH1>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <FormField label="Tags">
          <TagSelection
            tags={state.tags}
            setTags={(tags) => updateState({ tags })}
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
        {allowSubmit && 'Unsaved changes'}
        <Button
          disabled={!allowSubmit}
          onClick={(e) => {
            e.preventDefault()
            if (!allowSubmit) {
              return
            }

            mutation({
              variables: {
                id: stack.id ?? '',
                attributes: {
                  clusterId: stack.cluster?.id ?? '',
                  name: stack.name,
                  configuration: deepOmitKey(
                    stack.configuration,
                    '__typename' as const
                  )!,
                  git: deepOmitKey(stack.git, '__typename' as const)!,
                  repositoryId: stack.repository?.id ?? '',
                  type: stack.type,
                  tags: tagsToNameValue(state.tags),
                },
              },
            })
          }}
          loading={loading}
        >
          Save
        </Button>
      </div>
    </Card>
  )
}
