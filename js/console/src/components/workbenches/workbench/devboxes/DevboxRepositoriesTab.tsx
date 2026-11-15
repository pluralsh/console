import {
  Button,
  Chip,
  CodeEditor,
  Flex,
  Input,
  Markdown,
  PencilIcon,
  PlusIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import {
  DevboxInstanceFragment,
  useAddDevboxRepositoryMutation,
  useDevboxRepositoriesQuery,
} from 'generated/graphql'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { DevboxFileContent, DevboxWorkspaceApi } from './devboxWorkspaceApi'

export const PROJECT_MD_PATH = '~/Project.md'

export function DevboxRepositoriesTab({
  instance,
  api,
  live,
}: {
  instance: DevboxInstanceFragment
  api: DevboxWorkspaceApi
  live: boolean
}) {
  const { popToast } = useSimpleToast()
  const [repo, setRepo] = useState('')
  const { data, error, refetch } = useDevboxRepositoriesQuery({
    variables: { instanceId: instance.id },
    skip: !live,
    fetchPolicy: 'cache-and-network',
  })
  const [add, addState] = useAddDevboxRepositoryMutation({
    onCompleted: () => {
      setRepo('')
      refetch()
      popToast({ content: 'Repository cloned', severity: 'success' })
    },
  })
  const repositories = live
    ? (data?.devboxRepositories ?? []).filter(isNonNullable)
    : (instance.checkouts ?? []).filter(isNonNullable)

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <Flex
        direction="column"
        gap="small"
      >
        <Subtitle2H1>Repositories</Subtitle2H1>
        {error && <GqlError error={error} />}
        {!repositories.length && (
          <CaptionP $color="text-xlight">No repositories cloned yet.</CaptionP>
        )}
        {repositories.map((r) => (
          <RepoRowSC key={r.path ?? r.name}>
            <Flex
              direction="column"
              css={{ minWidth: 0 }}
            >
              <strong>{r.name}</strong>
              <CaptionP $color="text-xlight">
                {r.path}
                {r.remoteUrl ? ` · ${r.remoteUrl}` : ''}
              </CaptionP>
            </Flex>
            <Flex
              gap="xsmall"
              align="center"
            >
              {r.branch && <Chip size="small">{r.branch}</Chip>}
              {r.dirty && (
                <Chip
                  size="small"
                  severity="warning"
                >
                  uncommitted changes
                </Chip>
              )}
              {!!r.ahead && <Chip size="small">↑{r.ahead}</Chip>}
              {!!r.behind && <Chip size="small">↓{r.behind}</Chip>}
              {r.worktreeThreadId && <Chip size="small">worktree</Chip>}
            </Flex>
          </RepoRowSC>
        ))}
        {live && (
          <Flex gap="small">
            <Input
              placeholder="https://github.com/org/repo"
              value={repo}
              css={{ flex: 1 }}
              onChange={(e) => setRepo(e.currentTarget.value)}
              onEnter={() =>
                repo.trim() &&
                add({
                  variables: {
                    instanceId: instance.id,
                    repository: repo.trim(),
                  },
                })
              }
            />
            <Button
              small
              secondary
              startIcon={<PlusIcon />}
              loading={addState.loading}
              disabled={!repo.trim()}
              onClick={() =>
                add({
                  variables: {
                    instanceId: instance.id,
                    repository: repo.trim(),
                  },
                })
              }
            >
              Add repository
            </Button>
          </Flex>
        )}
        {addState.error && <GqlError error={addState.error} />}
      </Flex>
      <ProjectMd
        api={api}
        live={live}
      />
    </Flex>
  )
}

function ProjectMd({ api, live }: { api: DevboxWorkspaceApi; live: boolean }) {
  const [file, setFile] = useState<Nullable<DevboxFileContent>>(null)
  const [error, setError] = useState<Nullable<Error>>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const available = live && !!api.readFile

  const load = useCallback(() => {
    if (!available) return
    api
      .readFile?.(PROJECT_MD_PATH)
      .then(setFile)
      .catch(() => setFile({ path: PROJECT_MD_PATH, content: '' }))
  }, [api, available])
  useEffect(() => load(), [load])

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Flex
        justify="space-between"
        align="center"
      >
        <Flex direction="column">
          <Subtitle2H1>Project.md</Subtitle2H1>
          <CaptionP $color="text-xlight">
            Shared context every agent on this instance reads.
          </CaptionP>
        </Flex>
        {available && !!api.writeFile && !editing && (
          <Button
            small
            secondary
            startIcon={<PencilIcon />}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        )}
      </Flex>
      {!available ? (
        <CaptionP $color="text-xlight">
          {live
            ? "Console doesn't serve devbox files yet (devboxFile, writeDevboxFile)."
            : 'Resume the instance to view Project.md.'}
        </CaptionP>
      ) : error ? (
        <GqlError error={error} />
      ) : editing ? (
        <CodeEditor
          value={file?.content ?? ''}
          language="markdown"
          height={400}
          save
          saving={saving}
          onSave={(content) => {
            setSaving(true)
            api.writeFile!(PROJECT_MD_PATH, content, file?.sha256)
              .then((written) => {
                setFile(written)
                setEditing(false)
              })
              .catch((e) => setError(e as Error))
              .then(() => setSaving(false))
          }}
        />
      ) : file?.content ? (
        <Markdown text={file.content} />
      ) : (
        <CaptionP $color="text-xlight">Project.md is empty.</CaptionP>
      )}
    </Flex>
  )
}

const RepoRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.medium,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.default,
}))
