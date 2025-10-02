import {
  Button,
  Card,
  FormField,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useTheme } from 'styled-components'
import { isEmpty } from 'lodash'

import {
  useGitRepositoriesQuery,
  useGitRepositoryQuery,
  useUpdateStackMutation,
} from '../../../generated/graphql'
import { RepositorySelector } from '../../cd/services/deployModal/DeployServiceSettingsGit'
import { mapExistingNodes } from '../../../utils/graphql'
import { GqlError } from '../../utils/Alert'

import { StackOutletContextT } from '../Stacks'

import { OverlineH1 } from '../../utils/typography/Text'

export default function StackRepository() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack, refetch } = useOutletContext() as StackOutletContextT
  const [repositoryId, setRepositoryId] = useState(stack.repository?.id ?? '')
  const [ref, setRef] = useState(stack.git.ref)
  const [folder, setFolder] = useState(stack.git.folder)
  const changed =
    repositoryId !== stack.repository?.id ||
    ref !== stack.git.ref ||
    folder !== stack.git.folder
  const valid = !isEmpty(repositoryId) && !isEmpty(ref) && !isEmpty(folder)

  const { data } = useGitRepositoriesQuery()

  const repos = mapExistingNodes(data?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )

  const { data: repoData } = useGitRepositoryQuery({
    variables: { id: repositoryId },
  })

  const [mutation, { loading, error }] = useUpdateStackMutation({
    variables: {
      id: stackId,
      attributes: {
        name: stack.name,
        type: stack.type,
        clusterId: stack.cluster?.id ?? '',
        repositoryId,
        git: { folder, ref },
        configuration: {
          image: stack.configuration.image,
          version: stack.configuration.version,
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
        Repository
      </OverlineH1>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
          marginBottom: theme.spacing.large,
        }}
      >
        <FormField
          label="Repository"
          required
        >
          <RepositorySelector
            repositories={repos}
            repositoryId={repositoryId}
            setRepositoryId={setRepositoryId}
          />
        </FormField>
        <FormField
          label="Ref"
          required
        >
          {repoData?.gitRepository?.refs && (
            <Select
              label="Select a branch or tag"
              selectedKey={ref}
              onSelectionChange={(ref) => setRef(ref as string)}
            >
              {cleanRefs(repoData?.gitRepository?.refs).map((ref) => (
                <ListBoxItem
                  key={ref}
                  label={ref}
                />
              ))}
            </Select>
          )}
          {!repoData?.gitRepository?.refs && (
            <Input
              value={ref}
              onChange={(e) => setRef(e.currentTarget.value)}
            />
          )}
        </FormField>
        <FormField
          label="Folder"
          required
        >
          <Input
            value={folder}
            onChange={(e) => setFolder(e.currentTarget.value)}
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
          disabled={!valid || !changed}
          onClick={() => mutation()}
          loading={loading}
        >
          Save
        </Button>
      </div>
    </Card>
  )
}

const cleanRefs = (refs: string[] | null) => {
  return refs?.map((ref) => ref.replace(/^(?:\/)?(?:refs\/heads\/)?/, '')) ?? []
}
