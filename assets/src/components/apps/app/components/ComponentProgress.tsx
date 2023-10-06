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
  const split = componentsReady?.split('/') || []
  const ready = split?.length > 1 && Number(split[0]) === Number(split[1])
  const severity = ready ? 'success' : 'warning'

  return (
    <Flex gap="small">
      {label && 'Components'}
      <Chip
        size="small"
        severity={severity}
      >
        {componentsReady} {suffix}
      </Chip>
    </Flex>
  )
}

ComponentProgress.defaultProps = { label: true, suffix: '' }

export default ComponentProgress
