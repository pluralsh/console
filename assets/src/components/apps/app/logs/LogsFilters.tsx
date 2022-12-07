import { Button, FiltersIcon, ListBoxItem } from '@pluralsh/design-system'
import { LOG_FILTER_Q } from 'components/graphql/plural'
import { Div } from 'honorable'
import { useCallback, useState } from 'react'
import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'

import { LogsInfoPanel } from './LogsInfoPanel'

function selectedFilter(labels, search, spec) {
  if ((spec.query || '') !== search) return false

  for (const { name, value } of spec.labels) {
    if (labels[name] !== value) return false
  }

  return true
}

export default function LogsFilters({
  labels, search, setSearch, setLabels,
}) {
  const { appName } = useParams()
  const [open, setOpen] = useState<boolean>(true)
  const { data } = useQuery(LOG_FILTER_Q, { variables: { namespace: appName } })

  const clear = useCallback(() => {
    setSearch('')
    setLabels({})
  }, [setSearch, setLabels])

  const select = useCallback(({ query, labels }) => {
    if (labels) setLabels(labels.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {}))
    setSearch(query || '')
  }, [setSearch, setLabels])

  if (!data?.logFilters) return null

  const { logFilters } = data

  if (logFilters.length < 1) return null

  return (
    <Div position="relative">
      <Button
        secondary
        startIcon={<FiltersIcon />}
        height={40}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        Filters
      </Button>
      {open && (
        <LogsInfoPanel
          title="Filters"
          subtitle="Select an attribute below to apply a filter."
          onClose={() => setOpen(false)}
          position="absolute"
          top={40}
          right={0}
          marginTop="medium"
        >
          {logFilters.map(({ metadata: { name }, spec }) => {
            const selected = selectedFilter(labels, search, spec)

            return (
              <ListBoxItem
                key={name}
                label={spec.name}
                description={spec.description}
                textValue={name}
                selected={selected}
                onClick={selected ? clear : () => select(spec)}
              />
            )
          })}
        </LogsInfoPanel>
      )}
    </Div>
  )
}
