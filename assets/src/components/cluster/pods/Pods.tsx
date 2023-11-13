import { ComponentProps, forwardRef, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'
import { Div, Flex, useDebounce } from 'honorable'
import {
  AppsIcon,
  ComboBox,
  EmptyState,
  Input,
  ListBoxFooter,
  ListBoxItem,
  SearchIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import Fuse from 'fuse.js'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import type { RootQueryType } from 'generated/graphql'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { isEqual } from 'utils/kubernetes'
import { isEmpty, uniqBy } from 'lodash'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { GqlError } from 'components/utils/Alert'

import { PODS_Q, PODS_SUB } from '../queries'
import { SHORT_POLL_INTERVAL } from '../constants'

import {
  ColActions,
  ColContainers,
  ColCpuReservation,
  ColImages,
  ColMemoryReservation,
  ColName,
  ColNamespace,
  ColRestarts,
  PodWithId,
  PodsList,
} from './PodsList'

const ListBoxFooterPlusInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))

export const NamespaceListFooter = forwardRef<
  HTMLDivElement,
  Omit<ComponentProps<typeof ListBoxFooterPlusInner>, 'children'>
>(({ leftContent, ...props }, ref) => {
  const theme = useTheme()
  const label = 'View all'

  return (
    <ListBoxFooterPlusInner
      ref={ref}
      leftContent={
        leftContent || (
          <AppsIcon
            size={16}
            color={theme.colors['text-primary-accent'] as string}
          >
            {label}
          </AppsIcon>
        )
      }
      {...props}
    >
      {label}
    </ListBoxFooterPlusInner>
  )
})

const searchOptions = {
  keys: ['metadata.name'],
  threshold: 0.25,
}

const breadcrumbs = [{ label: 'pods', url: '/pods' }]

export default function AllPods() {
  useSetBreadcrumbs(breadcrumbs)

  const { data, refetch, error, subscribeToMore } = useQuery<{
    cachedPods: RootQueryType['cachedPods']
    applications: RootQueryType['applications']
    namespaces: RootQueryType['namespaces']
  }>(PODS_Q, {
    pollInterval: SHORT_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  /*
    TODO: Add subscription when subscription actually starts returning values.
  */
  useEffect(
    () =>
      subscribeToMore({
        document: PODS_SUB,
        updateQuery: (prev, { subscriptionData: { data } }: any) => {
          if (!data?.podDelta) return prev
          const {
            podDelta: { delta, payload },
          } = data

          if (delta === 'CREATE')
            return {
              ...prev,
              cachedPods: uniqBy(
                [payload, ...(prev.cachedPods ?? [])],
                (p) => `${p.metadata.name}:${p.metadata.namespace}`
              ),
            }
          if (delta === 'DELETE')
            return {
              ...prev,
              cachedPods: prev.cachedPods?.filter((p) => !isEqual(p!, payload)),
            }

          return prev
        },
        onError: (e) => {
          console.error('subscribe error msg', e.message)
        },
      }),
    [subscribeToMore]
  )

  const columns = useMemo(
    () => [
      ColNamespace,
      ColName,
      ColMemoryReservation,
      ColCpuReservation,
      ColRestarts,
      ColContainers,
      ColImages,
      ColActions(refetch),
    ],
    [refetch]
  )
  const theme = useTheme()
  const namespace = useParams().namespace || null
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState<string>(namespace || '')
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 300)

  // Filter out namespaces that don't exist in the pods list
  const namespaces = useMemo(() => {
    if (!data?.cachedPods) {
      return []
    }
    const namespaceSet = new Set<string>()

    for (const pod of data?.cachedPods || []) {
      if (pod?.metadata?.namespace) {
        namespaceSet.add(pod.metadata.namespace)
      }
    }

    return (
      data?.namespaces?.filter(
        (ns) => ns?.metadata?.name && namespaceSet.has(ns.metadata.name)
      ) || []
    )
  }, [data?.namespaces, data?.cachedPods])

  //  Filter out namespaces that don't match search criteria
  const filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(namespaces, searchOptions)

    return inputValue
      ? fuse.search(inputValue).map(({ item }) => item)
      : namespaces
  }, [namespaces, inputValue])

  const pods = useMemo(() => {
    if (!data?.cachedPods) {
      return undefined
    }
    let pods = data.cachedPods
      .map((pod) => ({ id: pod?.metadata?.namespace, ...pod }) as PodWithId)
      .filter((pod?: PodWithId): pod is PodWithId => !!pod) as PodWithId[]

    if (namespace) {
      pods = pods?.filter((pod) => pod?.metadata?.namespace === namespace)
    }

    return pods || []
  }, [data, namespace])

  const reactTableOptions = useMemo(
    () => ({
      state: { globalFilter: debouncedFilterString },
    }),
    [debouncedFilterString]
  )

  if (error) {
    return (
      <GqlError
        header="Sorry, something went wrong"
        error={error}
      />
    )
  }

  return (
    <ResponsivePageFullWidth
      heading="Pods"
      scrollable={false}
      headingContent={
        isEmpty(namespaces) ? null : (
          <Div width={320}>
            <ComboBox
              inputProps={{ placeholder: 'Filter by namespace' }}
              inputValue={inputValue}
              onInputChange={setInputValue}
              selectedKey={namespace}
              onSelectionChange={(ns) => {
                if (ns) {
                  setInputValue(`${ns}`)
                  navigate(`/pods/${ns}`)
                }
              }}
              // Close combobox panel once footer is clicked.
              // It does not work with isOpen and onOpenChange at the moment.
              dropdownFooterFixed={
                <NamespaceListFooter
                  onClick={() => {
                    setInputValue('')
                    navigate('/pods')
                  }}
                />
              }
              aria-label="namespace"
              width={320}
            >
              {filteredNamespaces?.map((namespace, i) => (
                <ListBoxItem
                  key={`${namespace?.metadata?.name || i}`}
                  textValue={`${namespace?.metadata?.name}`}
                  label={`${namespace?.metadata?.name}`}
                />
              )) || []}
            </ComboBox>
          </Div>
        )
      }
    >
      {!data ? (
        <LoadingIndicator />
      ) : (
        <Flex
          direction="column"
          height="100%"
        >
          <Input
            startIcon={<SearchIcon />}
            placeholder="Filter pods"
            value={filterString}
            onChange={(e) => setFilterString(e.currentTarget.value)}
            marginBottom={theme.spacing.medium}
          />
          {!pods || pods.length === 0 ? (
            <EmptyState message="No pods match your selection" />
          ) : (
            <FullHeightTableWrap>
              <PodsList
                pods={pods}
                applications={data?.applications}
                columns={columns}
                reactTableOptions={reactTableOptions}
                maxHeight="unset"
                height="100%"
              />
            </FullHeightTableWrap>
          )}
        </Flex>
      )}
    </ResponsivePageFullWidth>
  )
}
