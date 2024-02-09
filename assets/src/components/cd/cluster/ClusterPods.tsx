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
import Fuse from 'fuse.js'
import { useDebounce } from '@react-hooks-library/core'

import { GqlError } from 'components/utils/Alert'

import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import {
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
import { columnHelper } from '../../cluster/nodes/NodesList'
import { TableCaretLink } from '../../cluster/TableElements'
import { getPodDetailsPath } from '../../../routes/cdRoutesConsts'

const POLL_INTERVAL = 10 * 1000

const searchOptions = {
  keys: ['metadata.name'],
  threshold: 0.25,
}

export const ColActions = columnHelper.display({
  id: 'actions',
  cell: ({ row: { original }, table }: any) => {
    const { linkBasePath } =
      (table.options?.meta as {
        refetch?: () => void
        linkBasePath?: string
      }) || {}

    return (
      <div
        css={{
          display: 'flex',
          gap: 'xxsmall',
          justifyContent: 'flex-end',
          width: '100%',
        }}
      >
        {/* TODO */}
        {/* <DeletePod */}
        {/*  name={original.name} */}
        {/*  namespace={original.namespace} */}
        {/*  refetch={refetch} */}
        {/* /> */}
        <div onClick={(e) => e.stopPropagation()}>
          <TableCaretLink
            to={`${linkBasePath || '/pods'}/${original.namespace}/${
              original.name
            }`}
            textValue={`View pod ${original?.name}`}
          />
        </div>
      </div>
    )
  },
  header: '',
})

const columns = [
  ColNamespace,
  ColName,
  ColMemoryReservation,
  ColCpuReservation,
  ColRestarts,
  ColContainers,
  ColImages,
  ColActions,
]

export default function ClusterPods() {
  const { clusterId = '' } = useParams()
  const [namespace, setNamespace] = useState<string>('')
  const { data: namespacesData, refetch } = useClusterNamespacesQuery({
    variables: { clusterId },
    pollInterval: POLL_INTERVAL,
  })
  const { data, error } = useClusterPodsQuery({
    variables: { clusterId, namespace },
    pollInterval: POLL_INTERVAL,
  })
  const theme = useTheme()
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
    const pods = data?.pods?.edges
      ?.map(
        (edge) =>
          ({ id: edge?.node?.metadata?.namespace, ...edge?.node }) as PodWithId
      )
      ?.filter((pod?: PodWithId): pod is PodWithId => !!pod) as PodWithId[]

    return pods || []
  }, [data])

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

  return !data ? (
    <LoadingIndicator />
  ) : (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
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
          <div
            css={{
              width: 320,
            }}
          >
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
          </div>
        )}
      </div>
      {!pods || pods.length === 0 ? (
        <EmptyState message="No pods match your selection" />
      ) : (
        <FullHeightTableWrap>
          <PodsList
            pods={pods}
            columns={columns}
            reactTableOptions={reactTableOptions}
            refetch={refetch}
            linkBasePath={getPodDetailsPath({
              clusterId,
              isRelative: false,
            })}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      )}
    </div>
  )
}
