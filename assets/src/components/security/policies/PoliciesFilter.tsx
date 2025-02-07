import {
  Accordion,
  AccordionItem,
  Checkbox,
  Flex,
  Input,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { useClustersQuery, ViolationStatisticsQuery } from 'generated/graphql'
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'

import { mapExistingNodes } from '../../../utils/graphql'
import { useProjectId } from '../../contexts/ProjectsContext'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

const FETCH_MARGIN = 30

function PoliciesFilter({
  selectedKinds,
  setSelectedKinds,
  selectedNamespaces,
  setSelectedNamespaces,
  selectedClusters,
  setSelectedClusters,
  kindsData,
  namespacesData,
}: {
  selectedKinds: (string | null)[]
  setSelectedKinds: Dispatch<SetStateAction<(string | null)[]>>
  selectedNamespaces: (string | null)[]
  setSelectedNamespaces: Dispatch<SetStateAction<(string | null)[]>>
  selectedClusters: (string | null)[]
  setSelectedClusters: Dispatch<SetStateAction<(string | null)[]>>
  kindsData?: ViolationStatisticsQuery
  namespacesData?: ViolationStatisticsQuery
}) {
  const theme = useTheme()
  const projectId = useProjectId()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 100)

  const {
    data: clustersData,
    loading,
    pageInfo,
    fetchNextPage,
  } = useFetchPaginatedData(
    {
      queryHook: useClustersQuery,
      keyPath: ['clusters'],
    },
    {
      q: debouncedSearchString,
      projectId,
    }
  )

  const kinds = kindsData?.violationStatistics
    ?.map((statistic) => ({
      id: statistic?.value || '',
      count: statistic?.count,
    }))
    .filter(({ id }) => Boolean(id))

  const namespaces = namespacesData?.violationStatistics
    ?.map((statistic) => ({
      id: statistic?.value || '',
      count: statistic?.count,
    }))
    .filter(({ id }) => Boolean(id))

  const clusters = useMemo(
    () => mapExistingNodes(clustersData?.clusters),
    [clustersData?.clusters]
  )

  const clusterLabel = 'Cluster'
  const kindLabel = 'Kind'
  const namespaceLabel = 'Namespace'

  function handleCheckboxChange(
    setSelected: Dispatch<SetStateAction<(string | null)[]>>,
    value: string | null,
    checked: boolean
  ) {
    setSelected((prev) => {
      if (checked) {
        return [...prev, value]
      }

      return prev.filter((el) => el !== value)
    })
  }

  const fetchMoreClustersOnBottomReached = useCallback(
    (element?: HTMLDivElement | undefined) => {
      if (!element) return

      const { scrollHeight, scrollTop, clientHeight } = element

      if (
        scrollHeight - scrollTop - clientHeight < FETCH_MARGIN &&
        !loading &&
        pageInfo.hasNextPage
      ) {
        fetchNextPage()
      }
    },
    [fetchNextPage, loading, pageInfo]
  )

  return (
    <Accordion
      defaultValue={[clusterLabel, kindLabel, namespaceLabel]}
      type="multiple"
      css={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'fit-content',
      }}
    >
      <AccordionItem
        trigger={clusterLabel}
        value={clusterLabel}
        css={{ overflow: 'hidden' }}
      >
        <Flex
          direction="column"
          height="100%"
          gap="small"
        >
          <Input
            minHeight="fit-content"
            placeholder="Filter clusters"
            value={searchString}
            onChange={(e) => setSearchString?.(e.currentTarget.value)}
          />
          <div
            css={{ overflowY: 'auto' }}
            onScrollCapture={(e) =>
              fetchMoreClustersOnBottomReached(e?.target as HTMLDivElement)
            }
          >
            {[{ id: null, name: 'No cluster' }, ...clusters].map((cluster) => (
              <Checkbox
                small
                key={cluster.id}
                name={clusterLabel}
                value={cluster.id}
                checked={selectedClusters.includes(cluster.id)}
                onChange={({ target: { checked } }: any) => {
                  handleCheckboxChange(setSelectedClusters, cluster.id, checked)
                }}
              >
                {cluster.name}
              </Checkbox>
            ))}
          </div>
        </Flex>
      </AccordionItem>
      <AccordionItem
        trigger={kindLabel}
        value={kindLabel}
        css={{
          overflow: 'hidden',
          borderTop: theme.borders.default,
          borderBottom: theme.borders.default,
        }}
      >
        <div css={{ height: '100%', overflowY: 'auto' }}>
          <Checkbox
            small
            name={kindLabel}
            value={null}
            checked={selectedKinds.includes(null)}
            onChange={({ target: { checked } }: any) =>
              handleCheckboxChange(setSelectedKinds, null, checked)
            }
          >
            No kind
          </Checkbox>
          {kinds?.map((kind) => (
            <CheckboxWrapperSC key={kind.id}>
              <Checkbox
                small
                name="kinds"
                value={kind.id}
                checked={selectedKinds.includes(kind.id)}
                onChange={({ target: { checked } }: any) =>
                  handleCheckboxChange(setSelectedKinds, kind.id, checked)
                }
              >
                {kind.id}
                {` (${kind.count ?? '-'})`}
              </Checkbox>
            </CheckboxWrapperSC>
          ))}
        </div>
      </AccordionItem>
      <AccordionItem
        trigger={namespaceLabel}
        value={namespaceLabel}
        css={{ overflow: 'hidden' }}
      >
        <div css={{ height: '100%', overflowY: 'auto' }}>
          <Checkbox
            small
            name={namespaceLabel}
            value={null}
            checked={selectedNamespaces.includes(null)}
            onChange={({ target: { checked } }: any) =>
              handleCheckboxChange(setSelectedNamespaces, null, checked)
            }
          >
            No namespace
          </Checkbox>
          {namespaces?.map((namespace) => (
            <CheckboxWrapperSC key={namespace.id}>
              <Checkbox
                small
                name={namespaceLabel}
                value={namespace}
                checked={selectedNamespaces.includes(namespace.id)}
                onChange={({ target: { checked } }: any) =>
                  handleCheckboxChange(
                    setSelectedNamespaces,
                    namespace.id,
                    checked
                  )
                }
              >
                {namespace.id}
                {` (${namespace.count ?? '-'})`}
              </Checkbox>
            </CheckboxWrapperSC>
          ))}
        </div>
      </AccordionItem>
    </Accordion>
  )
}

export default PoliciesFilter

const CheckboxWrapperSC = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
})
