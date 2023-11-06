import { Input } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'

import { isNonNullable } from 'utils/isNonNullable'

import { VersionSelect } from '../VersionSelect'

import { isRequired } from './CreateClusterContent'

export function NameVersionHandle({
  name,
  setName,
  version,
  setVersion,
  versions,
  handle,
  setHandle,
}: {
  name: string
  setName: (name: string) => void
  version?: string
  setVersion?: (version: string) => void
  versions?: Nullable<Nullable<string>[]>
  handle: string
  setHandle: (handle: string) => void
}) {
  const theme = useTheme()
  const filteredVersions = useMemo(
    () => versions?.filter(isNonNullable) || [],
    [versions]
  )

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
        }}
      >
        <Input
          css={{ width: 'fit-content', flexGrow: 1 }}
          placeholder="workload-cluster-0"
          value={name}
          onChange={({ target: { value } }) => setName(value)}
          prefix={<div>Name{isRequired('name') && '*'}</div>}
        />
        {setVersion && (
          <div
            css={{
              flexBasis: '140px',
            }}
          >
            <VersionSelect
              selectedKey={version}
              versions={filteredVersions}
              onSelectionChange={setVersion as any}
              label={`Version${isRequired('name') && '*'}`}
            />
          </div>
        )}
      </div>
      <Input
        placeholder="custom-handle"
        value={handle}
        onChange={({ target: { value } }) => setHandle(value)}
        prefix={<div>Handle{isRequired('handle') && '*'}</div>}
      />
    </div>
  )
}
