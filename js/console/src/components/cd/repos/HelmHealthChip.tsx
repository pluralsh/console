import { Chip, Tooltip } from '@pluralsh/design-system'
import { Fragment } from 'react/jsx-runtime'

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
    <Fragment key={i}>
      {line}
      {i !== arr.length - 1 && <br />}
    </Fragment>
  ))

  if (message) {
    return (
      <Tooltip
        placement="top"
        label={
          <div
            css={{
              maxWidth: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {errorLines}
          </div>
        }
      >
        {chip}
      </Tooltip>
    )
  }

  return chip
}
