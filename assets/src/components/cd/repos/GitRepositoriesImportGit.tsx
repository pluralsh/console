import {
  Button,
  Code,
  GitHubLogoIcon,
  Input,
  usePrevious,
} from '@pluralsh/design-system'
import { useCreateGitRepositoryMutation } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { GqlError } from 'components/utils/Alert'

import ModalAlt, { StepBody, StepH, StepLink } from '../ModalAlt'

const scaffoldTabs = [
  {
    key: 'nodejs',
    label: 'Node.js',
    language: 'sh',
    content: `plural scaffold --type nodejs --name <my-service>`,
  },
  {
    key: 'rails',
    label: 'Rails',
    language: 'sh',
    content: `plural scaffold --type rails --name <my-service>`,
  },
  {
    key: 'springboot',
    label: 'Spring boot',
    language: 'sh',
    content: `plural scaffold --type springboot --name <my-service>`,
  },
  {
    key: 'django',
    label: 'Django',
    language: 'sh',
    content: `plural scaffold --type django --name <my-service>`,
  },
]

export function ImportGit({ refetch }: { refetch: () => void }) {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const wasOpen = usePrevious(isOpen)
  const closeModal = useCallback(() => setIsOpen(false), [])

  const [gitUrl, setGitUrl] = useState('')
  const [mutation, { loading, error }] = useCreateGitRepositoryMutation({
    variables: { attributes: { url: gitUrl } },
    onCompleted: () => {
      refetch?.()
      closeModal()
    },
  })

  useEffect(() => {
    if (isOpen && !wasOpen) {
      setGitUrl('')
    }
  }, [isOpen, wasOpen])
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
    if (isOpen) {
      inputRef.current?.focus?.()
    }
  }, [isOpen])

  return (
    <>
      <Button
        primary
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Import Git
      </Button>
      <ModalAlt
        header="Import Git"
        open={isOpen}
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
              Import
            </Button>
            <Button
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
            gap: theme.spacing.xxsmall,
          }}
        >
          <StepH>Step 1. Prepare your Git repository</StepH>
          <StepBody>
            Need some help to Git ready? Use a plural scaffold to get started or
            read our{' '}
            <StepLink
              href="https://docs.plural.sh/getting-started/quickstart"
              target="_blank"
            >
              quick start guide
            </StepLink>
            .
          </StepBody>
        </div>
        <Code tabs={scaffoldTabs} />
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
          }}
        >
          <StepH>Step 2. Connect your repository</StepH>
          <Input
            inputProps={{ ref: inputRef }}
            value={gitUrl}
            onChange={(e) => {
              setGitUrl(e.currentTarget.value)
            }}
            placeholder="https://host.com/your-repo.git"
            titleContent={<GitHubLogoIcon />}
          />
        </div>
        {error && (
          <GqlError
            header="Problem importing repository"
            error={error}
          />
        )}
      </ModalAlt>
    </>
  )
}
