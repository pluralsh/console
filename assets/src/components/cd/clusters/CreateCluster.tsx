import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Button, usePrevious } from '@pluralsh/design-system'

import { useCreateGitRepositoryMutation } from '../../../generated/graphql'
import ModalAlt from '../ModalAlt'

export default function CreateCluster() {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const wasOpen = usePrevious(isOpen)
  const closeModal = useCallback(() => setIsOpen(false), [])
  const onClose = useCallback(() => setIsOpen(false), [])
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
        onClick={() => setIsOpen(true)}
      >
        Create cluster
      </Button>
      <ModalAlt
        header="Create a cluster"
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
          ...
        </div>
      </ModalAlt>
    </>
  )
}
