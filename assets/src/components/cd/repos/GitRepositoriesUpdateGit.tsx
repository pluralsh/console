import {
  Button,
  FormField,
  GitHubLogoIcon,
  Input,
} from '@pluralsh/design-system'
import {
  GitRepositoriesRowFragment,
  useUpdateGitRepositoryMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { GqlError } from 'components/utils/Alert'

import ModalAlt from '../ModalAlt'

export function UpdateGitRepository({
  repo,
  refetch,
}: {
  repo: GitRepositoriesRowFragment
  refetch: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback(() => setIsOpen(false), [])

  return (
    <>
      <Button
        secondary
        small
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Update
      </Button>
      {isOpen && (
        <ModalForm
          repo={repo}
          refetch={refetch}
          onClose={closeModal}
        />
      )}
    </>
  )
}

export function ModalForm({
  repo,
  onClose,
  refetch,
}: {
  repo: GitRepositoriesRowFragment
  onClose: () => void
  refetch: () => void
}) {
  const theme = useTheme()

  const [gitUrl, setGitUrl] = useState(repo.url || '')
  const [mutation, { loading, error }] = useUpdateGitRepositoryMutation({
    variables: { id: repo.id, attributes: { url: gitUrl } },
    onCompleted: () => {
      refetch?.()
      onClose()
    },
  })
  const closeModal = useCallback(
    (e?: Event) => {
      e?.preventDefault?.()
      onClose()
    },
    [onClose]
  )

  const disabled = !gitUrl
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (gitUrl && !loading) {
        mutation()
      }
    },
    [gitUrl, loading, mutation]
  )

  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <ModalAlt
      header="Update Git repository"
      open
      portal
      onClose={closeModal}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          <Button
            type="submit"
            disabled={disabled}
            loading={loading}
            primary
          >
            Update
          </Button>
          <Button
            type="button"
            secondary
            onClick={closeModal}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xsmall,
        }}
      >
        <FormField label="Git repository URL">
          <Input
            inputProps={{ ref: inputRef }}
            value={gitUrl}
            onChange={(e) => {
              setGitUrl(e.currentTarget.value)
            }}
            placeholder="https://host.com/your-repo.git"
            titleContent={<GitHubLogoIcon />}
          />
        </FormField>
      </div>
      {error && (
        <GqlError
          header="Problem updating repository"
          error={error}
        />
      )}
    </ModalAlt>
  )
}
