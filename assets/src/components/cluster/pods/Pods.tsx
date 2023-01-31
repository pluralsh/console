import {
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useQuery } from '@apollo/client'
import { Div, Flex, useDebounce } from 'honorable'
import {
  AppsIcon,
  Input,
  ListBoxFooter,
  ListBoxItem,
  LoopingLogo,
  SearchIcon,
  Select,
} from '@pluralsh/design-system'
import { useNavigate, useParams } from 'react-router-dom'
import { ListBoxFooterProps } from '@pluralsh/design-system/dist/components/ListBoxItem'
import styled, { useTheme } from 'styled-components'

import type { RootQueryType } from 'generated/graphql'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'

import { PODS_Q } from '../queries'
import { POLL_INTERVAL } from '../constants'

import {
  ColActions,
  ColContainers,
  ColCpuReservation,
  ColMemoryReservation,
  ColNameLink,
  ColNamespace,
  ColRestarts,
  PodWithId,
  PodsList,
} from './PodsList'

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

export default function AllPods() {
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([{ text: 'pods', url: '/pods' }]),
    [setBreadcrumbs])

  const { data, refetch, error } = useQuery<{
    pods: RootQueryType['pods']
    applications: RootQueryType['applications']
    namespaces: RootQueryType['namespaces']
  }>(PODS_Q, {
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  /*
    TODO: Add subscription when subscription actually starts returning values.
  */
  // useEffect(() => {
  //   console.log('subscribe!')
  //   subscribeToMore({
  //     document: PODS_SUB,
  //     updateQuery: (prev, { subscriptionData }) => {
  //       console.log('subscribe prev', prev)
  //       console.log('subscribe data', subscriptionData)

  //       return prev
  //     },
  //     onError: e => {
  //       console.log('subscribe error msg', e.message)
  //     },
  //   })
  // }, [subscribeToMore])

  const columns = useMemo(() => [
    ColNamespace,
    ColNameLink,
    ColMemoryReservation,
    ColCpuReservation,
    ColRestarts,
    ColContainers,
    ColActions(refetch),
  ],
  [refetch])
  const theme = useTheme()
  const namespace = useParams().namespace || null
  const navigate = useNavigate()
  const [selectIsOpen, setSelectIsOpen] = useState(false)
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 300)

  // Filter out namespaces that don't exist in the pods list
  const namespaces = useMemo(() => {
    if (!data?.pods) {
      return []
    }
    const namespaceSet = new Set<string>()

    for (const pod of data?.pods?.edges || []) {
      if (pod?.node?.metadata?.namespace) {
        namespaceSet.add(pod.node.metadata.namespace)
      }
    }

    return (
      data?.namespaces?.filter(ns => ns?.metadata?.name && namespaceSet.has(ns.metadata.name)) || []
    )
  }, [data?.namespaces, data?.pods])

  const pods = useMemo(() => {
    if (!data?.pods?.edges) {
      return undefined
    }
    let pods = data.pods.edges
      .map(edge => (edge?.node
        ? {
          id: edge.node.metadata?.namespace,
          ...edge.node,
        }
        : undefined))
      .filter((pod?: PodWithId): pod is PodWithId => !!pod) as PodWithId[]

    if (namespace) {
      pods = pods?.filter(pod => pod?.metadata?.namespace === namespace)
    }

    return pods || []
  }, [data, namespace])

  const reactTableOptions = useMemo(() => ({
    state: { globalFilter: debouncedFilterString },
  }),
  [debouncedFilterString])

  if (error) {
    return <>Sorry, something went wrong</>
  }

  return (
    <ResponsivePageFullWidth
      heading="Pods"
      scrollable={false}
      headingContent={
        !namespaces || namespaces.length === 0 ? null : (
          <Div width={320}>
            <Select
              label="Filter by namespace"
              placement="right"
              width={320}
              selectedKey={namespace}
              isOpen={selectIsOpen}
              onOpenChange={setSelectIsOpen}
              onSelectionChange={toNamespace => navigate(`/pods/${toNamespace}`)}
              dropdownFooterFixed={(
                <NamespaceListFooter
                  onClick={() => {
                    navigate('/pods')
                    setSelectIsOpen(false)
                  }}
                />
              )}
            >
              {namespaces?.map((namespace, i) => (
                <ListBoxItem
                  key={`${namespace?.metadata?.name || i}`}
                  textValue={`${namespace?.metadata?.name}`}
                  label={`${namespace?.metadata?.name}`}
                />
              )) || []}
            </Select>
          </Div>
        )
      }
    >
      {!data ? (
        <LoopingLogo />
      ) : (
        <Flex
          direction="column"
          height="100%"
        >
          <Input
            startIcon={<SearchIcon />}
            placeholder="Filter pods"
            value={filterString}
            onChange={e => setFilterString(e.currentTarget.value)}
            marginBottom={theme.spacing.medium}
          />
          <Flex
            flexDirection="column"
            overflow="hidden"
            {...{
              '& > div': {
                maxHeight: '100%',
              },
            }}
          >
            <PodsList
              pods={pods}
              applications={data?.applications}
              columns={columns}
              reactTableOptions={reactTableOptions}
              maxHeight="unset"
              height="100%"
            />
          </Flex>
        </Flex>
      )}
    </ResponsivePageFullWidth>
  )
}
