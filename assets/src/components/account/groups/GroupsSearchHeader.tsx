import { SearchIcon } from '@pluralsh/design-system'
import ListInput from 'components/utils/ListInput'

export default function GroupSearchHeader({ q, setQ }: any) {
  return (
    <ListInput
      width="100%"
      value={q}
      placeholder="Search a group"
      startIcon={<SearchIcon color="text-light" />}
      onChange={({ target: { value } }) => setQ(value)}
      flexGrow={0}
    />
  )
}
