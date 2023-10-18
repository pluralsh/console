import {
  Button,
  ComboBox,
  FormField,
  Input,
  ListBoxItem,
} from '@pluralsh/design-system'
import { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { compareItems, rankItem } from '@tanstack/match-sorter-utils'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { DeployServiceModal } from './DeployService'

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
  setRepositoryId: Dispatch<SetStateAction<string>>
  gitRef: string
  setGitRef: Dispatch<SetStateAction<string>>
  gitFolder: string
  setGitFolder: Dispatch<SetStateAction<string>>
}) {
  const [comboBoxInput, setComboBoxInput] = useState('')

  const selectedRepo = repos.find((r) => r.id === repositoryId)

  const repoSearchResults = useMemo(
    () =>
      repos
        .map((repo) => {
          const rankingInfo = rankItem(repo, comboBoxInput, {
            accessors: [(v) => v.url],
          })

          return { item: repo, rankingInfo }
        })
        .filter((item) => item.rankingInfo.passed)
        .sort((a, b) => compareItems(a.rankingInfo, b.rankingInfo)),
    [comboBoxInput, repos]
  )

  return (
    <>
      <FormField label="Connect your repository">
        <ComboBox
          inputValue={comboBoxInput}
          onInputChange={(inputVal) => setComboBoxInput(inputVal)}
          selectedKey={repositoryId}
          onSelectionChange={(key) => {
            setRepoId(key as any)
            setComboBoxInput('')
          }}
          inputProps={{
            placeholder: selectedRepo
              ? selectedRepo.url
              : 'Select a Git repository',
          }}
        >
          {repoSearchResults.map(({ item: { id, url } }) => (
            <ListBoxItem
              key={id}
              label={url}
            />
          ))}
        </ComboBox>
      </FormField>
      <FormField
        label="Git ref"
        required
        hint="Branch name, tag name, or commit SHA"
      >
        <Input
          value={gitRef}
          onChange={(e) => setGitRef(e.currentTarget.value)}
        />
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
  )
}

export function DeployService({ refetch }: { refetch: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        primary
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Deploy service
      </Button>
      <ModalMountTransition open={isOpen}>
        <DeployServiceModal
          refetch={refetch}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
