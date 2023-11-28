import { Input, ListBoxItem, Select } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { coerce, rsort } from 'semver'

import { TabularNumbers } from '../../../cluster/TableElements'
import { toNiceVersion, trimVersion } from '../../../../utils/semver'

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
    () =>
      rsort<string>(
        (versions?.filter(isNonNullable) || []).map(
          (v) => coerce(v)?.version ?? v
        )
      ).map((v) => trimVersion(v)),
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
            <Select
              selectedKey={version}
              onSelectionChange={setVersion as any}
              label={`Version${isRequired('name') && '*'}`}
            >
              {filteredVersions.map((v) => (
                <ListBoxItem
                  key={v}
                  label={
                    <TabularNumbers css={{ textAlign: 'right' }}>
                      {toNiceVersion(v)}
                    </TabularNumbers>
                  }
                />
              ))}
            </Select>
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
