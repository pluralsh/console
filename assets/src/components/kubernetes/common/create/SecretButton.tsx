import { useState } from 'react'
import { Button, Toast } from '@pluralsh/design-system'
import { CreateSecretModal } from './SecretModal.tsx'
import { ModalMountTransition } from 'components/utils/ModalMountTransition.tsx'
import { useTheme } from 'styled-components'
import { getResourceDetailsAbsPath } from 'routes/kubernetesRoutesConsts.tsx'
import { Link, useParams } from 'react-router-dom'
import { Kind } from '../types.ts'

export function CreateSecretButton({ text, refetch }) {
  const theme = useTheme()
  const { clusterId } = useParams()

  const [open, setOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [secret, setSecret] = useState<{ name: string; namespace: string }>()
  const onCreate = (name: string, namespace: string) => {
    setSecret({ name, namespace })
    setShowToast(true)
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Button
        onClick={() => setOpen(true)}
        secondary
        floating
        css={{
          // align with the data select buttons
          height: '42px',
        }}
      >
        {text}
      </Button>
      {open && (
        <ModalMountTransition open={open}>
          <CreateSecretModal
            open={open}
            setOpen={setOpen}
            refetch={refetch}
            onCreate={onCreate}
          />
        </ModalMountTransition>
      )}
      <Toast
        severity="success"
        position="bottom"
        show={showToast}
        closeTimeout={5000}
        onClose={() => setShowToast(false)}
        css={{ margin: theme.spacing.large }}
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xsmall,
          }}
        >
          <span>Secret created successfully</span>

          <Link
            css={theme.partials.text.inlineLink}
            to={getResourceDetailsAbsPath(
              clusterId,
              Kind.Secret,
              secret?.name ?? '',
              secret?.namespace ?? ''
            )}
          >
            Go to secret
          </Link>
        </div>
      </Toast>
    </div>
  )
}
