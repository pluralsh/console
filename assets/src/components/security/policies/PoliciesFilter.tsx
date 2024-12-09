import {
  Accordion,
  AccordionItem,
  Checkbox,
  Flex,
  Input,
} from '@pluralsh/design-system'
import {
  ConstraintViolationField,
  useClustersQuery,
  useViolationStatisticsQuery,
} from 'generated/graphql'
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { useDebounce } from '@react-hooks-library/core'

import { useProjectId } from '../../contexts/ProjectsContext'
import { mapExistingNodes } from '../../../utils/graphql'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

const FETCH_MARGIN = 30

function PoliciesFilter({
  selectedKinds,
  setSelectedKinds,
  selectedNamespaces,
  setSelectedNamespaces,
  selectedClusters,
  setSelectedClusters,
}: {
  selectedKinds: (string | null)[]
  setSelectedKinds: Dispatch<SetStateAction<(string | null)[]>>
  selectedNamespaces: (string | null)[]
  setSelectedNamespaces: Dispatch<SetStateAction<(string | null)[]>>
  selectedClusters: (string | null)[]
  setSelectedClusters: Dispatch<SetStateAction<(string | null)[]>>
}) {
  const theme = useTheme()
  const projectId = useProjectId()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 100)

  const { data: kindsData } = useViolationStatisticsQuery({
    variables: {
      field: ConstraintViolationField.Kind,
    },
  })
  const { data: namespacesData } = useViolationStatisticsQuery({
    variables: {
      field: ConstraintViolationField.Namespace,
    },
  })

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

  const fetchMoreOnBottomReached = useCallback(
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
      css={{ overflow: 'auto' }}
    >
      <AccordionItem
        trigger={clusterLabel}
        value={clusterLabel}
      >
        <Input
          placeholder="Filter clusters"
          marginBottom={theme.spacing.small}
          value={searchString}
          onChange={(e) => setSearchString?.(e.currentTarget.value)}
        />
        <div
          css={{ minHeight: 56, maxHeight: 200, overflowY: 'auto' }}
          onScrollCapture={(e) =>
            fetchMoreOnBottomReached(e?.target as HTMLDivElement)
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
      </AccordionItem>
      <AccordionItem
        trigger={kindLabel}
        value={kindLabel}
        css={{
          borderTop: theme.borders.default,
          borderBottom: theme.borders.default,
        }}
      >
        <Flex flexDirection="column">
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
        </Flex>
      </AccordionItem>
      <AccordionItem
        trigger={namespaceLabel}
        value={namespaceLabel}
      >
        <Flex flexDirection="column">
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
        </Flex>
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
