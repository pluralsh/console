import { Button, usePrevious } from '@pluralsh/design-system'
import { useCreateServiceDeploymentMutation } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { GqlError } from 'components/utils/Alert'

import ModalAlt, { StepH } from '../ModalAlt'
import { PrepareGitStep } from '../PrepareGitStep'

export function DeployService({ refetch }: { refetch: () => void }) {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const wasOpen = usePrevious(isOpen)
  const closeModal = useCallback(() => setIsOpen(false), [])

  const [repoId, setRepoId] = useState('')
  const [gitFolder, setGitFolder] = useState('')
  const [gitRef, setGitRef] = useState('')
  const [name, setName] = useState('')
  const [namespace, setNamespace] = useState('')
  const disabled = !repoId || !gitFolder || !gitRef || !name || !namespace

  const [mutation, { loading, error }] = useCreateServiceDeploymentMutation({
    variables: {
      attributes: {
        repositoryId: repoId,
        name,
        namespace,
        git: { ref: gitRef, folder: gitFolder },
      },
    },
    onCompleted: () => {
      refetch?.()
      closeModal()
    },
  })

  useEffect(() => {
    if (isOpen && !wasOpen) {
      setRepoId('')
      setGitFolder('')
      setGitRef('')
      setName('')
      setNamespace('')
    }
  }, [isOpen, wasOpen])

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!disabled && !loading) {
        mutation()
      }
    },
    [disabled, loading, mutation]
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
        Deploy service{' '}
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
        <PrepareGitStep />
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
          }}
        >
          <StepH>Step 2. Connect your repository</StepH>
          {/* <Select /> */}
        </div>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
          }}
        >
          <StepH>Step 3. Connect your repository</StepH>
          {/* <Select /> */}
        </div>
        {error && (
          <GqlError
            header="Problem deploying service"
            error={error}
          />
        )}
      </ModalAlt>
    </>
  )
}
