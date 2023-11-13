import { Flex } from 'honorable'
import { Chip } from '@pluralsh/design-system'

interface ComponentProgressProps {
  label?: boolean
  suffix?: string
  componentsReady?: string | null | undefined
}

function ComponentProgress({
  label,
  suffix,
  componentsReady,
}: ComponentProgressProps) {
  const split = componentsReady?.split('/') || [0, 0]
  const numReady = Number(split[0]) ?? 0
  const numTotal = Number(split[1]) ?? 0
  const ready = numTotal > 0 && numReady >= numTotal
  const severity = ready ? 'success' : 'warning'

  return (
    <Flex gap="small">
      {label && 'Components'}
      <Chip
        size="small"
        severity={severity}
      >
        {numReady} / {numTotal} {suffix}
      </Chip>
    </Flex>
  )
}

ComponentProgress.defaultProps = { label: true, suffix: '' }

export default ComponentProgress
