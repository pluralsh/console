import { forwardRef, useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'
import { Flex } from 'honorable'
import {
  AppsIcon,
  ListBoxFooter,
  ListBoxItem,
  LoopingLogo,
  PageTitle,
  Select,
} from '@pluralsh/design-system'

import type { RootQueryType } from 'generated/graphql'

import { useNavigate, useParams } from 'react-router-dom'

import { ListBoxFooterProps } from '@pluralsh/design-system/dist/components/ListBoxItem'

import styled, { useTheme } from 'styled-components'

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

export default function AllPods() {
  const {
    data, refetch, error, subscribeToMore: _subscribeToMore,
  } = useQuery<{
    pods: RootQueryType['pods']
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

  const ListBoxFooterPlusInner = styled(ListBoxFooter)(({ theme }) => ({
    color: theme.colors['text-primary-accent'],
  }))
  const NamespaceListFooter = forwardRef<
    HTMLDivElement,
    Omit<ListBoxFooterProps, 'children'>
  >(({ leftContent, ...props }, ref) => {
    const theme = useTheme()
    const label = 'Select all'

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

  const columns = useMemo(() => [
    ColNameLink,
    ColNamespace,
    ColMemoryReservation,
    ColCpuReservation,
    ColRestarts,
    ColContainers,
    ColActions(refetch),
  ],
  [refetch])

  const namespace = useParams().namespace || null
  const navigate = useNavigate()

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

  const [selectIsOpen, setSelectIsOpen] = useState(false)

  if (error) {
    console.log('error', error)

    return <>'Sorry, something went wrong'</>
  }
  if (!data) {
    return <LoopingLogo />
  }

  return (
    <Flex
      direction="column"
      gap="xlarge"
    >
      <PageTitle heading="Pods">
        <Select
          placement="right"
          width="300px"
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
      </PageTitle>
      <PodsList
        pods={pods}
        columns={columns}
      />
    </Flex>
  )
}
