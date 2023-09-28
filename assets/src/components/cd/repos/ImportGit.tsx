import {
  Button,
  Code,
  GitHubLogoIcon,
  Input,
  usePrevious,
} from '@pluralsh/design-system'
import { useCreateGitRepositoryMutation } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useState } from 'react'

import ModalAlt from '../ModalAlt'

const StepH = styled.h3(({ theme }) => ({
  ...theme.partials.text.body2Bold,
}))
const StepBody = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
}))
const StepLink = styled.a(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))
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

export function ImportGit() {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const wasOpen = usePrevious(isOpen)
  const closeModal = useCallback(() => setIsOpen(false), [])
  const onClose = useCallback(() => {
    console.log('onClose')
    setIsOpen(false)
  }, [])
  const [gitUrl, setGitUrl] = useState('')
  const [mutation, { loading, error }] = useCreateGitRepositoryMutation({
    variables: { attributes: { url: gitUrl } },
  })

  console.log('error', error)

  useEffect(() => {
    if (isOpen && wasOpen) {
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
        onClose={onClose}
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
            value={gitUrl}
            onChange={(e) => {
              setGitUrl(e.currentTarget.value)
            }}
            placeholder="https://host.com/your-repo.git"
            titleContent={<GitHubLogoIcon />}
          />
        </div>
      </ModalAlt>
    </>
  )
}
