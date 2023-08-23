import { forwardRef, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'
import { Div, Flex, useDebounce } from 'honorable'
import {
  AppsIcon,
  Breadcrumb,
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
import { ListBoxFooterProps } from '@pluralsh/design-system/dist/components/ListBoxItem'
import styled, { useTheme } from 'styled-components'
import {
  type RootQueryType,
  usePostgresDatabasesQuery,
} from 'generated/graphql'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { isEqual } from 'utils/kubernetes'
import { isEmpty, uniqBy } from 'lodash'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { SHORT_POLL_INTERVAL } from '../cluster/constants'

import { ColName } from './DatabasesList'

const ListBoxFooterPlusInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))
const NamespaceListFooter = forwardRef<
  HTMLDivElement,
  Omit<ListBoxFooterProps, 'children'>
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

const breadcrumbs: Breadcrumb[] = [
  { label: 'plural-cluster' },
  { label: 'database-management', url: '/database-management' },
]

export default function DatabaseManagement() {
  const { availableFeatures } = useContext(SubscriptionContext)

  useSetBreadcrumbs(breadcrumbs)

  const { data, refetch, error, subscribeToMore } = usePostgresDatabasesQuery()

  const dbs = data?.postgresDatabases

  console.log('dbs', dbs)

  return <div>hi</div>

  //   /*
  //     TODO: Add subscription when subscription actually starts returning values.
  //   */
  //   useEffect(
  //     () =>
  //       subscribeToMore({
  //         document: PODS_SUB,
  //         updateQuery: (prev, { subscriptionData: { data } }: any) => {
  //           if (!data?.podDelta) return prev
  //           const {
  //             podDelta: { delta, payload },
  //           } = data

  //           if (delta === 'CREATE')
  //             return {
  //               ...prev,
  //               cachedDatabases: uniqBy(
  //                 [payload, ...(prev.cachedDatabases ?? [])],
  //                 (p) => `${p.metadata.name}:${p.metadata.namespace}`
  //               ),
  //             }
  //           if (delta === 'DELETE')
  //             return {
  //               ...prev,
  //               cachedDatabases: prev.cachedDatabases?.filter(
  //                 (p) => !isEqual(p!, payload)
  //               ),
  //             }

  //           return prev
  //         },
  //         onError: (e) => {
  //           console.error('subscribe error msg', e.message)
  //         },
  //       }),
  //     [subscribeToMore]
  //   )

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
    if (!data?.cachedDatabases) {
      return []
    }
    const namespaceSet = new Set<string>()

    for (const pod of data?.cachedDatabases || []) {
      if (pod?.metadata?.namespace) {
        namespaceSet.add(pod.metadata.namespace)
      }
    }

    return (
      data?.namespaces?.filter(
        (ns) => ns?.metadata?.name && namespaceSet.has(ns.metadata.name)
      ) || []
    )
  }, [data?.namespaces, data?.cachedDatabases])

  //  Filter out namespaces that don't match search criteria
  const filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(namespaces, searchOptions)

    return inputValue
      ? fuse.search(inputValue).map(({ item }) => item)
      : namespaces
  }, [namespaces, inputValue])

  const pods = useMemo(() => {
    if (!data?.cachedDatabases) {
      return undefined
    }
    let pods = data.cachedDatabases
      .map(
        (pod) => ({ id: pod?.metadata?.namespace, ...pod } as DatabaseWithId)
      )
      .filter(
        (pod?: DatabaseWithId): pod is DatabaseWithId => !!pod
      ) as DatabaseWithId[]

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

  if (!availableFeatures?.databaseManagement) {
    // Temporary -Klink
    console.log('not available')

    return <div>Not available</div>
  }

  if (error) {
    return <>Sorry, something went wrong</>
  }

  return (
    <ResponsivePageFullWidth
      heading="Databases"
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
              <DatabasesList
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
