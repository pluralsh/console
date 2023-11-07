import { Div, Flex } from 'honorable'
import {
  Button,
  EmptyState,
  Input,
  SearchIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useClusterAddOnsSuspenseQuery } from 'generated/graphql'

import Fuse from 'fuse.js'

import { ADDONS_PATH, CD_BASE_PATH } from 'routes/cdRoutesConsts'

import { useSuspenseQueryPolling } from 'components/hooks/suspense/useSuspenseQueryPolling'

import { CD_BASE_CRUMBS, POLL_INTERVAL } from '../ContinuousDeployment'

import AddOnCard from './AddOnCard'

function QueryEmptyState({ query, setQuery }) {
  return (
    <EmptyState
      message="No add-ons found."
      description={query ? `"${query}" did not match any add-ons.` : ''}
      width={600}
    >
      {query && (
        <Button
          secondary
          onClick={() => setQuery('')}
          marginTop="medium"
        >
          Reset filter
        </Button>
      )}
    </EmptyState>
  )
}

const searchOptions = {
  keys: ['name'],
  threshold: 0.25,
}

export default function AddOns() {
  const theme = useTheme()
  const [filterString, setFilterString] = useState<string>('')

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'add-ons',
          url: `/${CD_BASE_PATH}/${ADDONS_PATH}`,
        },
      ],
      []
    )
  )

  const { data } = useSuspenseQueryPolling(useClusterAddOnsSuspenseQuery(), {
    pollInterval: POLL_INTERVAL,
  })
  const addOns = data.clusterAddOns

  const filteredAddOns = useMemo(() => {
    if (!filterString) {
      return addOns || []
    }

    const fuse = new Fuse(addOns || [], searchOptions)

    return fuse.search(filterString).map((result) => result.item)
  }, [filterString, addOns])

  if (isEmpty(addOns)) return <LoadingIndicator />
  const noFilteredAddOns = isEmpty(filteredAddOns)

  return (
    <div
      css={{
        maxWidth: 1528,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      <Input
        placeholder="Search"
        startIcon={<SearchIcon />}
        value={filterString}
        onChange={(event) => setFilterString(event.target.value)}
        width="100%"
      />
      {!noFilteredAddOns ? (
        <Div
          display="grid"
          gap="small"
          gridTemplateColumns="repeat(auto-fit, minmax(450px, 1fr))"
        >
          {filteredAddOns?.map(
            (addOn) =>
              addOn && (
                <AddOnCard
                  key={addOn.name}
                  addOn={addOn}
                />
              )
          )}
        </Div>
      ) : (
        <Flex
          justifyContent="center"
          alignItems="center"
          minHeight="100%"
          overflow="auto"
        >
          <QueryEmptyState
            query={filterString}
            setQuery={setFilterString}
          />
        </Flex>
      )}
    </div>
  )
}
