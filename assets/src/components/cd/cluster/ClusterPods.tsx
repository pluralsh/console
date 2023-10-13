import { useParams } from 'react-router-dom'
import {
  ComboBox,
  EmptyState,
  Input,
  ListBoxItem,
  SearchIcon,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'
import { Div, Flex, useDebounce } from 'honorable'

import Fuse from 'fuse.js'

import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
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
} from '../../cluster/pods/PodsList'
import {
  useClusterNamespacesQuery,
  useClusterPodsQuery,
} from '../../../generated/graphql'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { NamespaceListFooter } from '../../cluster/pods/Pods'

const POLL_INTERVAL = 10 * 1000

const searchOptions = {
  keys: ['metadata.name'],
  threshold: 0.25,
}

export default function ClusterPods() {
  const { clusterId } = useParams()
  const { data, error, refetch } = useClusterPodsQuery({
    variables: { clusterId }, // TODO: Set namespace as param.
    pollInterval: POLL_INTERVAL,
  })
  const { data: namespacesData } = useClusterNamespacesQuery({
    variables: { clusterId },
    pollInterval: POLL_INTERVAL,
  })

  const columns = useMemo(
    () => [
      ColNamespace,
      ColName,
      ColMemoryReservation,
      ColCpuReservation,
      ColRestarts,
      ColContainers,
      ColImages,
      ColActions(refetch), // TODO: Update delete and details page.
    ],
    [refetch]
  )
  const theme = useTheme()
  const [namespace, setNamespace] = useState<string>('')
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 300)

  // Filter out namespaces that don't exist in the pods list
  const namespaces = useMemo(() => {
    if (isEmpty(data?.pods?.edges)) {
      return []
    }
    const namespaceSet = new Set<string>()

    for (const edge of data?.pods?.edges || []) {
      if (edge?.node?.metadata?.namespace) {
        namespaceSet.add(edge?.node?.metadata.namespace)
      }
    }

    return (
      namespacesData?.namespaces?.filter(
        (ns) => ns?.metadata?.name && namespaceSet.has(ns.metadata.name)
      ) || []
    )
  }, [namespacesData?.namespaces, data?.pods])

  //  Filter out namespaces that don't match search criteria
  const filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(namespaces, searchOptions)

    return !isEmpty(namespace)
      ? fuse.search(namespace).map(({ item }) => item)
      : namespaces
  }, [namespaces, namespace])

  const pods = useMemo(() => {
    if (isEmpty(data?.pods?.edges)) {
      return undefined
    }
    let pods = data?.pods?.edges
      ?.map(
        (edge) =>
          ({ id: edge?.node?.metadata?.namespace, ...edge?.node }) as PodWithId
      )
      ?.filter((pod?: PodWithId): pod is PodWithId => !!pod) as PodWithId[]

    if (!isEmpty(namespace)) {
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
    return <>Sorry, something went wrong</>
  }

  return !data ? (
    <LoadingIndicator />
  ) : (
    <Flex
      direction="column"
      height="100%"
    >
      <div css={{ display: 'flex', gap: theme.spacing.large }}>
        <Input
          startIcon={<SearchIcon />}
          placeholder="Filter pods"
          value={filterString}
          onChange={(e) => setFilterString(e.currentTarget.value)}
          marginBottom={theme.spacing.medium}
          flexGrow={1}
        />
        {isEmpty(namespaces) ? null : (
          <Div width={320}>
            <ComboBox
              inputProps={{ placeholder: 'Filter by namespace' }}
              inputValue={namespace}
              onInputChange={setNamespace}
              selectedKey={namespace}
              onSelectionChange={(ns) => {
                if (ns) {
                  setNamespace(`${ns}`)
                }
              }}
              // Close combobox panel once footer is clicked.
              // It does not work with isOpen and onOpenChange at the moment.
              dropdownFooterFixed={
                <NamespaceListFooter
                  onClick={() => {
                    setNamespace('')
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
        )}
      </div>
      {!pods || pods.length === 0 ? (
        <EmptyState message="No pods match your selection" />
      ) : (
        <FullHeightTableWrap>
          <PodsList
            pods={pods}
            // applications={data?.applications}
            columns={columns}
            reactTableOptions={reactTableOptions}
            maxHeight="unset"
            height="100%"
          />
        </FullHeightTableWrap>
      )}
    </Flex>
  )
}
