import {
  Button,
  Codeline,
  Flex,
  InlineCode,
  Modal,
  TerminalIcon,
} from '@pluralsh/design-system'
import { InlineLink } from 'components/utils/typography/InlineLink.tsx'
import { useState } from 'react'
import { useTheme } from 'styled-components'

export function AIAgentRunLocalButton({
  runId,
  repository,
}: {
  runId: string
  repository: string
}) {
  const { colors, spacing } = useTheme()
  const [open, setOpen] = useState(false)
  const command = `plural agents resume ${runId}`
  const repositoryDisplay = repository.startsWith('http') ? (
    <InlineLink
      href={repository}
      target="_blank"
      rel="noreferrer"
    >
      {repository}
    </InlineLink>
  ) : (
    <InlineCode>{repository}</InlineCode>
  )

  return (
    <>
      <Button
        small
        secondary
        startIcon={<TerminalIcon />}
        onClick={() => setOpen(true)}
      >
        Run locally
      </Button>
      <Modal
        header="Run agent locally"
        open={open}
        onClose={() => setOpen(false)}
        size="large"
        actions={
          <Button
            secondary
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        }
      >
        <Flex
          direction="column"
          gap="large"
        >
          <span>
            Resume this agent session from your local terminal with the Plural
            CLI. Use your local checkout of {repositoryDisplay}, and run the
            command from that repository directory so local file paths and git
            state line up.
          </span>
          <Flex
            direction="column"
            gap="small"
          >
            <span>
              1. Open your local checkout of the repository the agent used.
            </span>
            <Codeline css={{ background: colors['fill-two'] }}>
              cd /path/to/repository
            </Codeline>
          </Flex>
          <Flex
            direction="column"
            gap="small"
          >
            <span>2. Resume the uploaded agent session.</span>
            <Codeline css={{ background: colors['fill-two'] }}>
              {command}
            </Codeline>
          </Flex>
          <span
            css={{ color: colors['text-light'], marginTop: spacing.xsmall }}
          >
            The Plural CLI should already be installed and authenticated on your
            machine before running this command.
          </span>
        </Flex>
      </Modal>
    </>
  )
}
