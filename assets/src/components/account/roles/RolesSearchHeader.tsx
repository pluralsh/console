import { SearchIcon } from '@pluralsh/design-system'
import ListInput from 'components/utils/ListInput'

export default function RolesSearchHeader({ q, setQ }: any) {
  return (
    <ListInput
      css={{ width: '100%', flexShrink: 0, flexGrow: 0 }}
      value={q}
      placeholder="Search a role"
      startIcon={<SearchIcon color="text-light" />}
      onChange={({ target: { value } }) => setQ(value)}
    />
  )
}
