import {
  Button,
  Flex,
  Input,
  Modal,
  useCopyText,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useShareWorkbenchDashboardMutation } from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'
import { shareDashboardUrl } from './shareDashboardUrl'

export function ShareDashboardModal({
  open,
  onClose,
  dashboardId,
  publicId,
}: {
  open: boolean
  onClose: () => void
  dashboardId: string
  publicId?: string | null
}) {
  const [confirming, setConfirming] = useState(false)
  const [share, { loading, error, reset }] =
    useShareWorkbenchDashboardMutation()
  const url = publicId
    ? shareDashboardUrl(window.location.origin, publicId)
    : ''
  const { copied, handleCopy } = useCopyText(url, 2000)

  const close = () => {
    setConfirming(false)
    reset()
    onClose()
  }

  // errors render below via GqlError
  const setShared = (shared: boolean) =>
    share({ variables: { id: dashboardId, shared } })
      .then(() => setConfirming(false))
      .catch(() => {})

  return (
    <Modal
      open={open}
      onClose={close}
      size="large"
      header="Public link"
      actions={
        publicId ? (
          confirming ? (
            <Flex gap="medium">
              <Button
                secondary
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
              <Button
                destructive
                loading={loading}
                onClick={() => setShared(false)}
              >
                Stop sharing
              </Button>
            </Flex>
          ) : (
            <Flex gap="medium">
              <Button
                secondary
                onClick={handleCopy}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button
                destructive
                onClick={() => setConfirming(true)}
              >
                Stop sharing
              </Button>
            </Flex>
          )
        ) : (
          <Button
            primary
            loading={loading}
            onClick={() => setShared(true)}
          >
            Create public link
          </Button>
        )
      }
    >
      <BodySC>
        {!publicId && (
          <p>
            Anyone with the link can view live data from this dashboard. Filters
            are fixed to their defaults, and panels backed by Plural logs or by
            tools covered by workbench policies won't render. Later edits to
            this dashboard show up on the public link immediately.
          </p>
        )}
        {publicId && !confirming && (
          <p>
            Anyone with this link can view live data from this dashboard. Edits
            you make show up on it immediately.
          </p>
        )}
        {publicId && confirming && (
          <p>
            The link will stop working immediately. Sharing again creates a new
            link.
          </p>
        )}
        {publicId && !confirming && (
          <Input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
        {error && <GqlError error={error} />}
      </BodySC>
    </Modal>
  )
}

const BodySC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  '& p': { margin: 0 },
}))
