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

  return (
    <PoliciesFiltersContainer>
      <Accordion label="Cluster">
        <Flex direction="column">
          <Checkbox
            name="clusters"
            value={null}
            checked={selectedClusters.includes(null)}
            onChange={({ target: { checked } }: any) => {
              setSelectedClusters((prev) => {
                if (checked) {
                  return [...prev, null]
                }

                return prev.filter((id) => id !== null)
              })
            }}
          >
            No cluster
          </Checkbox>
          {clusters?.map((edge) => {
            if (!edge?.node) return null
            const { node } = edge

            return (
              <Checkbox
                key={node.id}
                name="clusters"
                value={node.id}
                checked={selectedClusters.includes(node.id)}
                onChange={({ target: { checked } }: any) => {
                  setSelectedClusters((prev) => {
                    if (checked) {
                      return [...prev, node.id]
                    }

                    return prev.filter((id) => id !== node.id)
                  })
                }}
              >
                {node.name}
              </Checkbox>
            )
          })}
        </Flex>
      </Accordion>
      <Accordion label="Kind">
        <Flex direction="column">
          <Checkbox
            name="kinds"
            value={null}
            checked={selectedKinds.includes(null)}
            onChange={({ target: { checked } }: any) => {
              setSelectedKinds((prev) => {
                if (checked) {
                  return [...prev, null]
                }

                return prev.filter((el) => el !== null)
              })
            }}
          >
            No kind
          </Checkbox>
          {kinds?.map((kind) => (
            <Checkbox
              key={kind}
              name="kinds"
              value={kind}
              checked={selectedKinds.includes(kind)}
              onChange={({ target: { checked } }: any) => {
                setSelectedKinds((prev) => {
                  if (checked) {
                    return [...prev, kind]
                  }

                  return prev.filter((el) => el !== kind)
                })
              }}
            >
              {kind}
            </Checkbox>
          ))}
        </Flex>
      </Accordion>
      <Accordion label="Namespace">
        <Flex direction="column">
          <Checkbox
            name="namespaces"
            value={null}
            checked={selectedNamespaces.includes(null)}
            onChange={({ target: { checked } }: any) => {
              setSelectedNamespaces((prev) => {
                if (checked) {
                  return [...prev, null]
                }

                return prev.filter((el) => el !== null)
              })
            }}
          >
            No namespace
          </Checkbox>
          {namespaces?.map((namespace) => (
            <Checkbox
              key={namespace}
              name="namespaces"
              value={namespace}
              checked={selectedNamespaces.includes(namespace)}
              onChange={({ target: { checked } }: any) => {
                setSelectedNamespaces((prev) => {
                  if (checked) {
                    return [...prev, namespace]
                  }

                  return prev.filter((el) => el !== namespace)
                })
              }}
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
