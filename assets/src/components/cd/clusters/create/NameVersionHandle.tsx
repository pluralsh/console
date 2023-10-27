import { Input } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export function NameVersionHandle({
  name,
  setName,
  version,
  setVersion,
  handle,
  setHandle,
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
          '&& > *': {
            flexGrow: 1,
          },
        }}
      >
        <Input
          css={{ width: 'fit-content' }}
          placeholder="workload-cluster-0"
          value={name}
          onChange={({ target: { value } }) => setName(value)}
          prefix={<div>Name*</div>}
        />
        <Input
          placeholder="1.24.11"
          value={version}
          onChange={({ target: { value } }) => setVersion(value)}
          prefix={<div>Version*</div>}
        />
      </div>
      <Input
        placeholder="custom-handle"
        value={handle}
        onChange={({ target: { value } }) => setHandle(value)}
        prefix={<div>Handle</div>}
      />
    </div>
  )
}
