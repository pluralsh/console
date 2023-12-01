import { Chip, Tooltip } from '@pluralsh/design-system'

export function getHelmHealthLabel(ready: boolean | null | undefined) {
  return ready ? 'Ready' : 'Failed'
}

export function HelmHealthChip({
  ready,
  message,
}: {
  ready: boolean | null | undefined
  message?: string | null | undefined
}) {
  const chip = (
    <Chip severity={ready ? 'success' : 'critical'}>
      {getHelmHealthLabel(ready)}
    </Chip>
  )

  const errorLines = (message || '').split('\n').map((line, i, arr) => (
    <>
      {line}
      {i !== arr.length - 1 && <br />}
    </>
  ))

  if (message) {
    return (
      <Tooltip
        placement="top"
        label={<div css={{ maxWidth: 500 }}>{errorLines}</div>}
      >
        {chip}
      </Tooltip>
    )
  }

  return chip
}
