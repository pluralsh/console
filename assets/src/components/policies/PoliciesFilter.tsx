import { Accordion, Radio, RadioGroup } from '@pluralsh/design-system'
import { Cluster } from 'generated/graphql'
import { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

function PoliciesFilter({
  clusters,
  selectedCluster,
  setSelectedCluster,
  kinds,
  selectedKind,
  setSelectedKind,
  namespaces,
  selectedNamespace,
  setSelectedNamespace,
}: {
  clusters?: Cluster[]
  selectedCluster: string
  setSelectedCluster: Dispatch<SetStateAction<string>>
  kinds?: string[]
  selectedKind: string
  setSelectedKind: Dispatch<SetStateAction<string>>
  namespaces?: string[]
  selectedNamespace: string
  setSelectedNamespace: Dispatch<SetStateAction<string>>
}) {
  return (
    <PoliciesFiltersContainer>
      <Accordion label="Cluster">
        <RadioGroup
          name="radio-group-cluster"
          value={selectedCluster}
          onChange={setSelectedCluster}
        >
          <Radio value="">All</Radio>
          {clusters?.map(({ id, name }) => <Radio value={id}>{name}</Radio>)}
        </RadioGroup>
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
  div: {
    borderRadius: 0,
  },
  'div:first-child': {
    borderTopLeftRadius: theme.borderRadiuses.large,
    borderTopRightRadius: theme.borderRadiuses.large,
  },
  'div:last-child': {
    borderBottomLeftRadius: theme.borderRadiuses.large,
    borderBottomRightRadius: theme.borderRadiuses.large,
  },
}))
