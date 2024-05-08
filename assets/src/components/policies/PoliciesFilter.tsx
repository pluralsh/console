import { Accordion, Checkbox, Radio, RadioGroup } from '@pluralsh/design-system'
import {
  ConstraintViolationField,
  useClustersQuery,
  useViolationStatisticsQuery,
} from 'generated/graphql'
import { Flex } from 'honorable'
import { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

function PoliciesFilter({
  selectedKind,
  setSelectedKind,
  selectedNamespace,
  setSelectedNamespace,
  selectedClusters,
  setSelectedClusters,
}: {
  selectedKind: string
  setSelectedKind: Dispatch<SetStateAction<string>>
  selectedNamespace: string
  setSelectedNamespace: Dispatch<SetStateAction<string>>
  selectedClusters: Array<string>
  setSelectedClusters: Dispatch<SetStateAction<Array<string>>>
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
          {clusters?.map((edge) => {
            if (!edge?.node) return null
            const { node } = edge

            return (
              <Checkbox
                key={node.id}
                name="options"
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
        <RadioGroup
          name="radio-group-kind"
          value={selectedKind}
          onChange={setSelectedKind}
        >
          <Radio value="">All</Radio>
          {kinds?.map((kind) => <Radio value={kind}>{kind}</Radio>)}
        </RadioGroup>
      </Accordion>
      <Accordion label="Namespace">
        <RadioGroup
          name="radio-group-namespace"
          value={selectedNamespace}
          onChange={setSelectedNamespace}
        >
          <Radio value="">All</Radio>
          {namespaces?.map((namespace) => (
            <Radio value={namespace}>{namespace}</Radio>
          ))}
        </RadioGroup>
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
