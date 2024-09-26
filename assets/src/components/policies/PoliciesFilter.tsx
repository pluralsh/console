import {
  Accordion,
  AccordionItem,
  Checkbox,
  Flex,
} from '@pluralsh/design-system'
import {
  ConstraintViolationField,
  useClustersQuery,
  useViolationStatisticsQuery,
} from 'generated/graphql'

import { Dispatch, SetStateAction, useMemo } from 'react'
import styled, { useTheme } from 'styled-components'

import { useProjectId } from '../contexts/ProjectsContext'
import { mapExistingNodes } from '../../utils/graphql'

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
  const { data: clustersData } = useClustersQuery({
    variables: {
      first: 100,
      projectId,
    },
  })

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
        <Flex flexDirection="column">
          <Checkbox
            name={clusterLabel}
            value={null}
            checked={selectedClusters.includes(null)}
            onChange={({ target: { checked } }: any) =>
              handleCheckboxChange(setSelectedClusters, null, checked)
            }
          >
            No cluster
          </Checkbox>
          {clusters?.map((node) => (
            <Checkbox
              key={node.id}
              name={clusterLabel}
              value={node.id}
              checked={selectedClusters.includes(node.id)}
              onChange={({ target: { checked } }: any) => {
                handleCheckboxChange(setSelectedClusters, node.id, checked)
              }}
            >
              {node.name}
            </Checkbox>
          ))}
        </Flex>
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
