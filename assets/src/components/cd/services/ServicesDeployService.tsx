import {
  Button,
  ComboBox,
  FormField,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import {
  useClustersTinyQuery,
  useCreateServiceDeploymentMutation,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { compareItems, rankItem } from '@tanstack/match-sorter-utils'
import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { mapExistingNodes } from 'utils/graphql'
import { produce } from 'immer'
import { DeleteIconButton } from 'components/utils/IconButtons'

import ProviderIcon from 'components/utils/Provider'

import ModalAlt from '../ModalAlt'

enum FormState {
  Initial = 'initial',
  Git = 'git',
  Secrets = 'secrets',
}

type Secret = { name: string; value: string }

const SecretsTableSC = styled.table(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto',
  rowGap: theme.spacing.medium,
  columnGap: theme.spacing.xsmall,
  alignItems: 'stretch',
  'tr, tbody, thead': {
    display: 'contents',
  },
  'thead th': {
    ...theme.partials.text.body2Bold,
  },
  th: {
    display: 'block',
    textAlign: 'left',
  },
  button: {
    alignSelf: 'center',
  },
}))

function SecretsSettings({
  secrets,
  setSecrets,
  setSecretsErrors,
}: {
  secrets: Secret[]
  setSecrets: Dispatch<SetStateAction<Secret[]>>
  setSecretsErrors: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()

  const { items, errorCount } = useMemo(() => {
    const names = new Set<string>()
    let errorCount = 0

    const items = secrets.map((secret) => {
      const duplicate = names.has(secret.name) && !!secret.name

      names.add(secret.name)

      const noName = !!secret.value && !secret.name

      if (duplicate || noName) {
        errorCount++
      }

      return {
        secret,
        errors: {
          duplicate,
          noName,
        },
      }
    })

    return { items, errorCount }
  }, [secrets])

  useEffect(() => {
    setSecretsErrors(errorCount > 0)
  }, [errorCount, setSecretsErrors])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {secrets.length > 0 && (
        <SecretsTableSC>
          <thead>
            <tr />
            <th>Name</th>
            <th>Value</th>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th />
          </thead>

          <tr className="header displayContents" />
          {items.map(({ secret, errors }, i) => (
            <tr
              key={i}
              className="displayContents"
            >
              <th>
                <FormField
                  error={errors.duplicate || errors.noName}
                  hint={
                    errors.noName
                      ? 'Name cannot be empty'
                      : errors.duplicate
                      ? 'Duplicate name'
                      : undefined
                  }
                >
                  <Input
                    error={errors.duplicate || errors.noName}
                    value={secret.name}
                    inputProps={{ 'aria-label': 'Name' }}
                    onChange={(e) => {
                      setSecrets((secrets) =>
                        produce(secrets, (draft) => {
                          draft[i].name = e.target.value
                        })
                      )
                    }}
                  />
                </FormField>
              </th>
              <th>
                <Input
                  value={secret.value}
                  inputProps={{ 'aria-label': 'Value' }}
                  onChange={(e) =>
                    setSecrets((secrets) =>
                      produce(secrets, (draft) => {
                        draft[i].value = e.target.value
                      })
                    )
                  }
                />
              </th>
              <th>
                <DeleteIconButton
                  css={{ marginTop: 4 }}
                  onClick={() => {
                    setSecrets((secrets) =>
                      produce(secrets, (draft) => {
                        draft.splice(i, 1)
                      })
                    )
                  }}
                />
              </th>
            </tr>
          ))}
        </SecretsTableSC>
      )}
      <Button
        type="button"
        secondary
        small
        size="tertiary"
        onClick={(e) => {
          e.preventDefault()
          setSecrets((secrets) => [...secrets, { name: '', value: '' }])
        }}
      >
        Add secret
      </Button>
    </div>
  )
}

export function DeployServiceModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: () => void
  refetch: () => void
}) {
  const [formState, setFormState] = useState<FormState>(FormState.Initial)
  const [clusterId, setClusterId] = useState('')
  const [name, setName] = useState('')
  const [repositoryId, setRepositoryId] = useState('')
  const [gitFolder, setGitFolder] = useState('')
  const [gitRef, setGitRef] = useState('')
  const [namespace, setNamespace] = useState('')
  const [secrets, setSecrets] = useState<Secret[]>([{ name: '', value: '' }])
  const [secretsErrors, setSecretsErrors] = useState(false)

  const configuration = useMemo(() => {
    const cfg: Record<string, string> = {}

    for (const { name, value } of secrets) {
      if (name) {
        cfg[name] = value
      }
    }

    return Object.entries(cfg).map(([name, value]) => ({
      name,
      value,
    }))
  }, [secrets])

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useCreateServiceDeploymentMutation({
      variables: {
        clusterId,
        attributes: {
          repositoryId,
          name,
          namespace,
          git: { ref: gitRef, folder: gitFolder },
          configuration,
        },
      },
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })

  const { data: reposData } = useGitRepositoriesQuery()

  const { data: clustersData } = useClustersTinyQuery()
  const clusters = useMemo(
    () => mapExistingNodes(clustersData?.clusters),
    [clustersData?.clusters]
  )

  const initialFormValid = name && namespace && clusterId
  const allowGoToGit = formState === FormState.Initial && initialFormValid
  const gitSettingsValid = repositoryId && gitFolder && gitRef
  const allowGoToSecrets =
    formState === FormState.Git && initialFormValid && gitSettingsValid

  const allowDeploy =
    formState === FormState.Secrets &&
    initialFormValid &&
    !secretsErrors &&
    !mutationLoading

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (allowGoToGit) {
        setFormState(FormState.Git)
      } else if (allowGoToSecrets) {
        setFormState(FormState.Secrets)
      } else if (allowDeploy) {
        mutation()
      }
    },
    [allowGoToGit, allowGoToSecrets, allowDeploy, mutation]
  )

  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  const repos = mapExistingNodes(reposData?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )
  const selectedCluster = clusters.find(({ id }) => clusterId === id)

  const initialLoading = !repos || !clusters

  return (
    <ModalAlt
      header="Deploy service"
      open={open}
      portal
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          {formState === FormState.Secrets ? (
            <>
              <Button
                type="submit"
                disabled={!allowDeploy}
                loading={mutationLoading}
                primary
              >
                Deploy service
              </Button>
              <Button
                secondary
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setFormState(FormState.Git)
                }}
              >
                Go back
              </Button>
            </>
          ) : formState === FormState.Git ? (
            <>
              <Button
                type="submit"
                disabled={!allowGoToSecrets}
                primary
              >
                Add secrets
              </Button>
              <Button
                secondary
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setFormState(FormState.Initial)
                }}
              >
                Go back
              </Button>
            </>
          ) : (
            <Button
              type="submit"
              disabled={!allowGoToGit}
              primary
            >
              Select Git repository
            </Button>
          )}
          <Button
            type="button"
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      {initialLoading ? (
        <LoadingIndicator />
      ) : formState === FormState.Initial ? (
        <>
          <FormField
            required
            label="Service name"
          >
            <Input
              inputProps={{ ref: inputRef }}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          </FormField>
          <FormField
            required
            label="Service namespace"
          >
            <Input
              value={namespace}
              onChange={(e) => setNamespace(e.currentTarget.value)}
            />
          </FormField>
          <FormField
            required
            label="Cluster"
          >
            <Select
              label="Select cluster"
              leftContent={
                selectedCluster && (
                  <ProviderIcon
                    provider={selectedCluster.provider?.cloud || ''}
                    width={16}
                  />
                )
              }
              selectedKey={clusterId || ''}
              onSelectionChange={(key) => {
                setClusterId(key as any)
              }}
            >
              {(clusters || []).map((cluster) => (
                <ListBoxItem
                  key={cluster.id}
                  label={cluster.name}
                  leftContent={
                    <ProviderIcon
                      provider={cluster.provider?.cloud || ''}
                      width={16}
                    />
                  }
                />
              ))}
            </Select>
          </FormField>
        </>
      ) : formState === FormState.Git ? (
        <GitSettings
          {...{
            repos,
            repositoryId,
            setRepositoryId,
            gitRef,
            setGitRef,
            gitFolder,
            setGitFolder,
          }}
        />
      ) : (
        <>
          <SecretsSettings
            secrets={secrets}
            setSecretsErrors={setSecretsErrors}
            setSecrets={setSecrets}
          />
          {mutationError && (
            <GqlError
              header="Problem deploying service"
              error={mutationError}
            />
          )}
        </>
      )}
    </ModalAlt>
  )
}

function GitSettings({
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
