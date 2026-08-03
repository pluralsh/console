import { Chip, ChipProps, ClockIcon } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export function WorkbenchQueuedPromptChip({
  count,
  fillLevel = 1,
  ...props
}: {
  count?: Nullable<number>
} & ChipProps) {
  const theme = useTheme()

  if (!count) return null

  return (
    <Chip
      size="small"
      severity="neutral"
      fillLevel={fillLevel}
      icon={<ClockIcon size={12} />}
      iconColor="icon-light"
      css={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .children': {
          whiteSpace: 'nowrap',
          color: theme.colors['text-light'],
        },
      }}
      {...props}
    >
      {count} queued
    </Chip>
  )
}
