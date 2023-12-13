import {
  ComboBox,
  FormField,
  GitHubLogoIcon,
  Input,
  ListBoxItem,
} from '@pluralsh/design-system'
import { ChangeEvent, EventHandler, useMemo, useState } from 'react'
import { compareItems, rankItem } from '@tanstack/match-sorter-utils'
import useOnUnMount from 'components/hooks/useOnUnMount'
import { InlineLink } from 'components/utils/typography/InlineLink'

export function DeployServiceSettingsGit({
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
          <ServiceGitRefField
            required
            value={gitRef}
            onChange={(e) => setGitRef(e.currentTarget.value)}
          />
          <ServiceGitFolderField
            required
            value={gitFolder}
            onChange={(e) => setGitFolder(e.currentTarget.value)}
          />
        </>
      )}
    </>
  )
}

export function ServiceGitRefField({
  value,
  onChange,
  required,
}: {
  value: string
  onChange: EventHandler<ChangeEvent<HTMLInputElement>>
  required?: boolean
}) {
  return (
    <FormField
      label="Git ref"
      required={required}
      hint="Branch name, tag name, or commit SHA"
    >
      <Input
        value={value}
        onChange={onChange}
      />
    </FormField>
  )
}

export function ServiceGitFolderField({
  value,
  onChange,
  required,
}: {
  value: string
  onChange: EventHandler<ChangeEvent<HTMLInputElement>>
  required?: boolean
}) {
  return (
    <FormField
      required={required}
      label="Git folder"
      hint="Folder within the source tree where manifests are located"
    >
      <Input
        value={value}
        onChange={onChange}
      />
    </FormField>
  )
}

export function RepositorySelector({
  repositories,
  repositoryId,
  setRepositoryId,
}: {
  repositories: any
  repositoryId: Nullable<string>
  setRepositoryId: (repositoryId: string) => void
}) {
  const [comboBoxInput, setComboBoxInput] = useState('')
  const [selectIsOpen, setSelectIsOpen] = useState(false)

  const selectedRepo = repositories.find((r) => r.id === repositoryId)

  const repoSearchResults = useMemo(
    () =>
      repositories
        .map((repo) => {
          const rankingInfo = rankItem(repo, comboBoxInput, {
            accessors: [(v) => v.url],
          })

          return { item: repo, rankingInfo }
        })
        .filter((item) => item.rankingInfo.passed)
        .sort((a, b) => compareItems(a.rankingInfo, b.rankingInfo)),
    [comboBoxInput, repositories]
  )

  return (
    <ComboBox
      inputValue={comboBoxInput}
      onInputChange={(inputVal) => setComboBoxInput(inputVal)}
      selectedKey={repositoryId}
      onSelectionChange={(key) => {
        setRepositoryId(key as any)
        setComboBoxInput('')
        setSelectIsOpen(false)
      }}
      inputProps={{
        placeholder: selectedRepo
          ? selectedRepo.url
          : 'Select a Git repository',
      }}
      startIcon={<GitHubLogoIcon />}
      dropdownHeader={repositoryId ? <ListBoxItem label="None" /> : undefined}
      isOpen={selectIsOpen}
      onOpenChange={(open) => setSelectIsOpen(open)}
      onHeaderClick={() => {
        setRepositoryId('')
        setSelectIsOpen(false)
      }}
    >
      {repoSearchResults.map(({ item: { id, url } }) => (
        <ListBoxItem
          key={id}
          label={url}
        />
      ))}
    </ComboBox>
  )
}
