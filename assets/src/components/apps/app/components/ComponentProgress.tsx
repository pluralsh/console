import { Flex } from 'honorable'
import { Chip } from '@pluralsh/design-system'

interface ComponentProgressProps {
  app: any
  label?: boolean
  suffix?: string
}

function ComponentProgress({ app, label, suffix }: ComponentProgressProps) {
  const componentsReady = app?.status?.componentsReady
  const split = componentsReady?.split('/')
  const ready = split?.length > 1 && split[0] === split[1]
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
