import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'

import useOnUnMount from 'components/hooks/useOnUnMount'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { useGitRepositoryQuery } from 'generated/graphql'

import { RepositorySelector } from '../../cd/services/deployModal/DeployServiceSettingsGit'

export function CreateStackModalFormRepository({
  repos,
  repositoryId,
  setRepositoryId: setRepoId,
  gitRef,
  setGitRef,
  gitFolder,
  setGitFolder,
}: {
  repos: any
  repositoryId: string
  setRepositoryId: (repositoryId: string) => void
  gitRef: string
  setGitRef: (gitRef: string) => void
  gitFolder: string
  setGitFolder: (gitFolder: string) => void
}) {
  useOnUnMount(() => {
    if (!(repositoryId && gitRef && gitFolder)) {
      setRepoId('')
      setGitFolder('')
      setGitRef('')
    }
  })

  const { data } = useGitRepositoryQuery({
    variables: { id: repositoryId },
  })

  return (
    <>
      <FormField
        label="Connect your repository"
        {...(repositoryId
          ? {
              caption: (
                <InlineLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setRepoId('')
                  }}
                >
                  Deselect
                </InlineLink>
              ),
            }
          : {})}
      >
        <RepositorySelector
          repositories={repos}
          repositoryId={repositoryId}
          setRepositoryId={setRepoId}
        />
      </FormField>
      {repositoryId && (
        <>
          <FormField
            label="Git ref"
            required
            hint="Branch name, tag name, or commit SHA"
          >
            {data?.gitRepository?.refs && (
              <Select
                label="Select a branch or tag"
                selectedKey={gitRef}
                onSelectionChange={(ref) => setGitRef(ref as string)}
              >
                {cleanRefs(data?.gitRepository?.refs).map((ref) => (
                  <ListBoxItem
                    key={ref}
                    label={ref}
                  />
                ))}
              </Select>
            )}
            {!data?.gitRepository?.refs && (
              <Input
                value={gitRef}
                onChange={(e) => setGitRef(e.currentTarget.value)}
              />
            )}
          </FormField>
          <FormField
            required
            label="Git folder"
            hint="Folder within the source tree where manifests are located"
          >
            <Input
              value={gitFolder}
              onChange={(e) => setGitFolder(e.currentTarget.value)}
            />
          </FormField>
        </>
      )}
    </>
  )
}

export const cleanRefs = (refs: string[] | null) => {
  return refs?.map((ref) => ref.replace(/^(?:\/)?(?:refs\/heads\/)?/, '')) ?? []
}
