import { ClockIcon, Flex, IconFrame } from '@pluralsh/design-system'
import { WorkbenchCronFragment } from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'

export function WorkbenchSidePanelCron({
  cron,
}: {
  cron: WorkbenchCronFragment
}) {
  const theme = useTheme()
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xsmall,
      }}
    >
      <Flex
        align="center"
        gap="xsmall"
      >
        <IconFrame
          icon={<ClockIcon />}
          size="xsmall"
        />
        <span
          css={{
            ...theme.partials.text.caption,
            fontFamily: 'monospace',
          }}
        >
          {cron.crontab}
        </span>
      </Flex>
      {cron.prompt && (
        <div>
          <p
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',

              ...(expanded
                ? { WebkitLineClamp: 'unset', display: 'block' }
                : { WebkitLineClamp: 3 }),
            }}
          >
            {cron.prompt}
          </p>
          {cron.prompt.split('\n').length > 3 || cron.prompt.length > 150 ? (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              css={{
                ...theme.partials.reset.button,
                ...theme.partials.text.caption,
                color: theme.colors['text-input-disabled'],
                marginTop: theme.spacing.xxsmall,
                padding: 0,

                '&:hover': {
                  color: theme.colors['text-xlight'],
                },
              }}
            >
              {expanded ? 'Read less' : 'Read more'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
