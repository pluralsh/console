import { Flex, Input, Button, ArrowTopRightIcon } from '@pluralsh/design-system'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { Body1P } from 'components/utils/typography/Text'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const GH_APP_URL = 'https://github.com/apps/plural-copilot'

export function GitHubAppSetup({
  submitInstallationId,
  loading,
}: {
  submitInstallationId: (id: string) => void
  loading: Nullable<boolean>
}) {
  const [showIdInput, setShowIdInput] = useState(false)
  const [installationId, setInstallationId] = useState('')
  return (
    <Flex
      direction="column"
      gap="large"
    >
      <Body1P>
        Quickly setup GitHub credentials for the Console by installing our
        pre-made GitHub application. You can either install via the link below,
        or{' '}
        <InlineLink
          as="span"
          onClick={() => setShowIdInput(true)}
        >
          manually enter an installation ID
        </InlineLink>
        .
      </Body1P>
      {showIdInput ? (
        <Flex gap="small">
          <Input
            background="transparent"
            flex={1}
            placeholder="Installation ID"
            value={installationId}
            onChange={(e) => setInstallationId(e.target.value)}
          />
          <Button
            secondary
            onClick={() => setShowIdInput(false)}
          >
            Cancel
          </Button>
          <Button
            loading={loading}
            disabled={!installationId || loading}
            onClick={() => submitInstallationId(installationId)}
          >
            Connect
          </Button>
        </Flex>
      ) : (
        <Button
          as={Link}
          to={GH_APP_URL}
          endIcon={<ArrowTopRightIcon />}
        >
          Install our GitHub app
        </Button>
      )}
    </Flex>
  )
}
