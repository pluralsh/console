import styled from 'styled-components'
import { ClockIcon, Flex, IconFrame } from '@pluralsh/design-system'
import { WorkbenchCronFragment } from 'generated/graphql'
import { useState } from 'react'

export function WorkbenchSidePanelCron({
  cron,
}: {
  cron: WorkbenchCronFragment
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <WrapperSC>
      <Flex
        align="center"
        gap="xsmall"
      >
        <IconFrame
          icon={<ClockIcon />}
          size="xsmall"
        />
        <CrontabSC>{cron.crontab}</CrontabSC>
      </Flex>
      {cron.prompt && (
        <div>
          <PromptSC $expanded={expanded}>{cron.prompt}</PromptSC>
          {cron.prompt.split('\n').length > 3 || cron.prompt.length > 150 ? (
            <ToggleSC onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? 'Read less' : 'Read more'}
            </ToggleSC>
          ) : null}
        </div>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

const CrontabSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  fontFamily: 'monospace',
}))

const PromptSC = styled.p<{ $expanded: boolean }>(({ theme, $expanded }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  display: $expanded ? 'block' : '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  WebkitLineClamp: $expanded ? 'unset' : 3,
}))

const ToggleSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.caption,
  color: theme.colors['text-input-disabled'],
  marginTop: theme.spacing.xsmall,
  padding: 0,

  '&:hover': {
    color: theme.colors['text-xlight'],
  },
}))
