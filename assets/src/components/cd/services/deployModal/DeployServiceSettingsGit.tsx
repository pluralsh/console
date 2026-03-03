import {
  ComboBox,
  FormField,
  GitHubLogoIcon,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { compareItems, rankItem } from '@tanstack/match-sorter-utils'
import useOnUnMount from 'components/hooks/useOnUnMount'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { useGitRepositoryQuery } from 'generated/graphql'
import {
  ChangeEvent,
  ComponentPropsWithRef,
  EventHandler,
  useMemo,
  useState,
} from 'react'

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
          <ServiceGitRefField
            required
            refs={data?.gitRepository?.refs}
            value={gitRef}
            setValue={setGitRef}
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

export const cleanRefs = (refs: string[] | null): string[] =>
  new Set(
    refs
      ?.map((ref) => ref.replace(/^\/+/, '').replace(/^refs\/heads\//, ''))
      .filter((ref) => !!ref.trim())
  )
    .values()
    .toArray()

export function ServiceGitRefField({
  refs,
  value,
  setValue,
  required,
  disabled,
  loading,
}: {
  value: string
  setValue: (ref: string) => void
  required?: boolean
  refs?: string[] | null
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <FormField
      label="Git ref"
      required={required}
      hint="Branch name, tag name, or commit SHA"
    >
      {loading ? (
        <RectangleSkeleton
          $width="100%"
          $height={38}
        />
      ) : (
        <>
          {refs && (
            <Select
              isDisabled={disabled}
              label="Select a branch or tag"
              selectedKey={value}
              onSelectionChange={(ref) => setValue(ref as string)}
            >
              {cleanRefs(refs).map((ref) => (
                <ListBoxItem
                  key={ref}
                  label={ref}
                />
              ))}
            </Select>
          )}
          {!refs && (
            <Input
              disabled={disabled}
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
            />
          )}
        </>
      )}
    </FormField>
  )
}

export function ServiceGitFolderField({
  value,
  onChange,
  required,
  placeholder,
  disabled,
  ...props
}: {
  value: string
  onChange: EventHandler<ChangeEvent<HTMLInputElement>>
  required?: boolean
  placeholder?: string
  disabled?: boolean
} & ComponentPropsWithRef<typeof FormField>) {
  return (
    <FormField
      required={required}
      label="Git folder"
      hint="Folder within the source tree where manifests are located"
      {...props}
    >
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </FormField>
  )
}

export function RepositorySelector({
  repositories,
  repositoryId,
  setRepositoryId,
  ...props
}: {
  repositories: any
  repositoryId: Nullable<string>
  setRepositoryId: (repositoryId: string) => void
} & Partial<ComponentPropsWithRef<typeof ComboBox>>) {
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
      {...props}
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
