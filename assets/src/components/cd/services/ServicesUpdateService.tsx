import {
  Button,
  FormField,
  GitHubLogoIcon,
  Input,
} from '@pluralsh/design-system'
import {
  ServiceDeploymentsRowFragment,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { GqlError } from 'components/utils/Alert'

import ModalAlt from '../ModalAlt'

export function UpdateService({
  repo,
  refetch,
}: {
  repo: ServiceDeploymentsRowFragment
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
          serviceDeployment={repo}
          refetch={refetch}
          onClose={closeModal}
        />
      )}
    </>
  )
}

export function ModalForm({
  serviceDeployment,
  onClose,
  refetch,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  onClose: () => void
  refetch?: () => void
}) {
  const theme = useTheme()

  const [_mutation, { loading, error }] = useUpdateServiceDeploymentMutation({
    variables: {
      id: serviceDeployment.id,
      attributes: {
        git: {
          folder: '',
          ref: '',
        },
      },
    },
    onCompleted: () => {
      refetch?.()
      onClose()
    },
  })
  const closeModal = useCallback(() => {
    onClose()
  }, [onClose])

  const disabled = true
  const onSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    // if (gitUrl && !loading) {
    //   mutation()
    // }
  }, [])

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
            // value={gitUrl}
            // onChange={(e) => {
            //   setGitUrl(e.currentTarget.value)
            // }}
            // placeholder="https://host.com/your-repo.git"
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
