import { Chip, Flex } from '@pluralsh/design-system'

interface FractionalChipProps {
  label?: string
  suffix?: string
  fraction?: string | null | undefined
}

function FractionalChip({ label, suffix, fraction }: FractionalChipProps) {
  const split = fraction?.split('/') || [0, 0]
  const numReady = Number(split[0]) ?? 0
  const numTotal = Number(split[1]) ?? 0
  const ready = numTotal > 0 && numReady >= numTotal
  const severity = ready ? 'success' : 'warning'

  return (
    <Flex gap="small">
      {label}
      <Chip
        size="small"
        severity={severity}
      >
        {numReady} / {numTotal} {suffix}
      </Chip>
    </Flex>
  )
}

export default FractionalChip
