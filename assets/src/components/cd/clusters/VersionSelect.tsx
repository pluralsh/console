import { ListBoxItem, Select, SelectPropsSingle } from '@pluralsh/design-system'
import { toNiceVersion } from 'utils/semver'
import { TabularNumbers } from 'components/cluster/TableElements'

export function VersionSelect({
  versions,
  ...props
}: Omit<SelectPropsSingle, 'children'> & { versions: string[] }) {
  return (
    <Select
      label="Select version"
      {...props}
    >
      {versions.map((v) => (
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
  )
}
