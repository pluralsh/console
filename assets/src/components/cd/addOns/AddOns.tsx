import {
  Button,
  EmptyState,
  Input,
  SearchIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Suspense, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { isEmpty } from 'lodash'
import Fuse from 'fuse.js'
import { Priority, useRegisterActions } from 'kbar'

import { ADDONS_REL_PATH, CD_ABS_PATH } from 'routes/cdRoutesConsts'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ClusterAddOnFragment, useClusterAddOnsQuery } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { PaletteSection } from 'components/CommandPalette'

import { CD_BASE_CRUMBS, POLL_INTERVAL } from '../ContinuousDeployment'

import AddOnCard from './AddOnCard'
import { InstallAddOnModal } from './InstallAddOn'

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
          url: `${CD_ABS_PATH}/${ADDONS_REL_PATH}`,
        },
      ],
      []
    )
  )

  const { data } = useClusterAddOnsQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const addOns = useMemo(
    () => data?.clusterAddOns?.filter(isNonNullable),
    [data?.clusterAddOns]
  )
  const [installAddon, setInstallAddon] = useState<ClusterAddOnFragment | null>(
    null
  )
  const [showInstall, setShowInstall] = useState(false)
  const kbarActions = useMemo(
    () =>
      addOns
        ?.map((addon) => ({
          id: `addon-${addon?.name}`,
          addon,
          name: addon?.name ?? '',
          section: PaletteSection.Addons,
          priority: Priority.HIGH,
          perform: () => {
            setInstallAddon(addon)
            setShowInstall(true)
          },
        }))
        .flat() ?? [],
    [addOns]
  )

  useRegisterActions(kbarActions, [kbarActions])

  const filteredAddOns = useMemo(() => {
    if (!filterString) {
      return addOns || []
    }
    const fuse = new Fuse(addOns || [], searchOptions)

    return fuse.search(filterString).map((result) => result.item)
  }, [filterString, addOns])

  if (isEmpty(addOns)) {
    return <LoadingIndicator />
  }
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
      {installAddon && (
        <Suspense fallback={null}>
          <ModalMountTransition open={showInstall}>
            <InstallAddOnModal
              addOn={installAddon as any}
              open={showInstall}
              onClose={() => setShowInstall(false)}
            />
          </ModalMountTransition>
        </Suspense>
      )}
      <Input
        placeholder="Search"
        startIcon={<SearchIcon />}
        value={filterString}
        onChange={(event) => setFilterString(event.target.value)}
        width="100%"
      />
      {!noFilteredAddOns ? (
        <div
          css={{
            display: 'grid',
            gap: theme.spacing.small,
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          }}
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
        </div>
      ) : (
        <div
          css={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100%',
            overflow: 'auto',
          }}
        >
          <QueryEmptyState
            query={filterString}
            setQuery={setFilterString}
          />
        </div>
      )}
    </div>
  )
}
