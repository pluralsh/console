import { ListBoxItem, Select } from '@pluralsh/design-system'
import { Container, Maybe, Pod } from 'generated/graphql'
import { useNavigate, useParams } from 'react-router-dom'

export default function AccountSideNav({
  containers = [],
  initContainers = [],
  pod,
}: {
  containers?: Maybe<Container>[]
  initContainers?: Maybe<Container>[]
  pod?: Pod
}) {
  const navigate = useNavigate()
  const { container: containerName } = useParams()

  return (
    <Select
      selectedKey={containerName}
      onSelectionChange={(toContainerName) => {
        navigate(
          `/pods/${pod?.metadata.namespace}/${pod?.metadata.name}/shell/${toContainerName}`
        )
      }}
    >
      {[
        ...initContainers.map((container, i) => (
          <ListBoxItem
            key={`init: ${container?.name || i}`}
            label={container?.name ? `init: ${container?.name}` : ''}
            textValue={container?.name ? `init: ${container?.name}` : ''}
          />
        )),
        ...containers.map((container, i) => (
          <ListBoxItem
            key={container?.name || `${i}`}
            label={container?.name || ''}
            textValue={container?.name || ''}
          />
        )),
      ]}
    </Select>
  )
}
