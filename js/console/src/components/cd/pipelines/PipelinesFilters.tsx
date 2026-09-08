import { Input, SearchIcon } from '@pluralsh/design-system'
import styled from 'styled-components'
import { useEffect, useState } from 'react'
import { useDebounce } from '@react-hooks-library/core'

const PipelinesFiltersSC = styled.div(({ theme }) => ({
  display: 'flex',
  columnGap: theme.spacing.medium,
  '.statusTab': {
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
  },
}))

export function PipelinesFilters({
  setFilterString: setFilterStringOuter,
}: {
  setFilterString: (filterString: string) => void
}) {
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)

  useEffect(() => {
    setFilterStringOuter(debouncedFilterString)
  }, [debouncedFilterString, setFilterStringOuter])

  return (
    <PipelinesFiltersSC>
      <Input
        placeholder="Search"
        startIcon={
          <SearchIcon
            border={undefined}
            size={undefined}
          />
        }
        value={filterString}
        onChange={(e) => {
          setFilterString(e.currentTarget.value)
        }}
        css={{ flexGrow: 1 }}
      />
    </PipelinesFiltersSC>
  )
}
