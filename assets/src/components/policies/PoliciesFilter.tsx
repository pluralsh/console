import { Accordion, Checkbox } from '@pluralsh/design-system'
import {
  ConstraintViolationField,
  useClustersQuery,
  useViolationStatisticsQuery,
} from 'generated/graphql'
import { Flex } from 'honorable'
import { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

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
  const { data: kindsData } = useViolationStatisticsQuery({
    variables: {
      field: ConstraintViolationField.Kind,
    },
  })
  const { data: namspacesData } = useViolationStatisticsQuery({
    variables: {
      field: ConstraintViolationField.Namespace,
    },
  })
  const { data: clustersData } = useClustersQuery({
    variables: {
      first: 100,
    },
  })

  const kinds = kindsData?.violationStatistics
    ?.map((statistic) => statistic?.value || '')
    .filter(Boolean)

  const namespaces = namspacesData?.violationStatistics
    ?.map((statistic) => statistic?.value || '')
    .filter(Boolean)

  const clusters = clustersData?.clusters?.edges

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
    <PoliciesFiltersContainer>
      <Accordion label={clusterLabel}>
        <Flex direction="column">
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
          {clusters?.map((edge) => {
            if (!edge?.node) return null
            const { node } = edge

            return (
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
            )
          })}
        </Flex>
      </Accordion>
      <Accordion label={kindLabel}>
        <Flex direction="column">
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
            <Checkbox
              key={kind}
              name="kinds"
              value={kind}
              checked={selectedKinds.includes(kind)}
              onChange={({ target: { checked } }: any) =>
                handleCheckboxChange(setSelectedKinds, kind, checked)
              }
            >
              {kind}
            </Checkbox>
          ))}
        </Flex>
      </Accordion>
      <Accordion label={namespaceLabel}>
        <Flex direction="column">
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
            <Checkbox
              key={namespace}
              name={namespaceLabel}
              value={namespace}
              checked={selectedNamespaces.includes(namespace)}
              onChange={({ target: { checked } }: any) =>
                handleCheckboxChange(setSelectedNamespaces, namespace, checked)
              }
            >
              {namespace}
            </Checkbox>
          ))}
        </Flex>
      </Accordion>
    </PoliciesFiltersContainer>
  )
}

export default PoliciesFilter

const PoliciesFiltersContainer = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  '> div': {
    borderRadius: 0,
    borderBottom: 'none',
  },
  '>div:first-child': {
    borderTopLeftRadius: theme.borderRadiuses.large,
    borderTopRightRadius: theme.borderRadiuses.large,
  },
  '>div:last-child': {
    borderBottomLeftRadius: theme.borderRadiuses.large,
    borderBottomRightRadius: theme.borderRadiuses.large,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
}))
