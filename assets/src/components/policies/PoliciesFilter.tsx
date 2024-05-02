import { Accordion, Radio, RadioGroup } from '@pluralsh/design-system'
import { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

function PoliciesFilter({
  kinds,
  selectedKind,
  setSelectedKind,
  namespaces,
  selectedNamespace,
  setSelectedNamespace,
}: {
  kinds?: string[]
  selectedKind: string
  setSelectedKind: Dispatch<SetStateAction<string>>
  namespaces?: string[]
  selectedNamespace: string
  setSelectedNamespace: Dispatch<SetStateAction<string>>
}) {
  return (
    <PoliciesFiltersContainer>
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
