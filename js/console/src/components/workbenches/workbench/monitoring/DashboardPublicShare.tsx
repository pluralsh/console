import { Button, Code, Flex, useCopyText } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useShareWorkbenchDashboardMutation } from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'
import { shareDashboardUrl } from './shareDashboardUrl'

export function DashboardPublicShare({
  dashboardId,
  publicId,
}: {
  dashboardId: string
  publicId?: string | null
}) {
  const [confirming, setConfirming] = useState(false)
  const [share, { loading, error }] = useShareWorkbenchDashboardMutation()
  const url = publicId
    ? shareDashboardUrl(window.location.origin, publicId)
    : ''
  const { copied, handleCopy } = useCopyText(url, 2000)

  // errors render below via GqlError
  const setShared = (shared: boolean) =>
    share({ variables: { id: dashboardId, shared } })
      .then(() => setConfirming(false))
      .catch(() => {})

  if (!publicId)
    return (
      <BodySC>
        <p>
          Anyone with the link can view live data from this dashboard. Filters
          are fixed to their defaults, and panels backed by Plural logs or by
          tools covered by workbench policies won't render. Later edits to this
          dashboard show up on the public link immediately.
        </p>
        {error && <GqlError error={error} />}
        <Button
          small
          primary
          loading={loading}
          onClick={() => setShared(true)}
        >
          Create public link
        </Button>
      </BodySC>
    )

  if (confirming)
    return (
      <BodySC>
        <p>
          The link will stop working immediately. Sharing again creates a new
          link.
        </p>
        {error && <GqlError error={error} />}
        <Flex gap="medium">
          <Button
            small
            secondary
            onClick={() => setConfirming(false)}
            css={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            small
            destructive
            loading={loading}
            onClick={() => setShared(false)}
            css={{ flex: 1 }}
          >
            Stop sharing
          </Button>
        </Flex>
      </BodySC>
    )

  return (
    <BodySC>
      <p>
        Anyone with this link can view live data from this dashboard. Edits you
        make show up on it immediately.
      </p>
      <Code
        showHeader={false}
        showLineNumbers={false}
        css={{ maxHeight: 120, overflow: 'auto' }}
      >
        {url}
      </Code>
      {error && <GqlError error={error} />}
      <Flex gap="medium">
        <Button
          small
          primary
          disabled={copied}
          onClick={handleCopy}
          css={{ flex: 1 }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
        <Button
          small
          destructive
          onClick={() => setConfirming(true)}
          css={{ flex: 1 }}
        >
          Stop sharing
        </Button>
      </Flex>
    </BodySC>
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
