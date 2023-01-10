import {
  ListBoxItem,
  PageCard,
  Select,
  VolumesIcon,
} from '@pluralsh/design-system'
import { Container, Maybe, Pod } from 'generated/graphql'
import { useNavigate, useParams } from 'react-router-dom'

export default function AccountSideNav({
  containers = [],
  pod,
}: {
  containers?: Maybe<Container>[]
  initContainers?: Maybe<Container>[]
  pod?: Pod
}) {
  const navigate = useNavigate()
  const { name, namespace, container: containerName } = useParams()

  return (
    <>
      <PageCard
        heading={pod?.metadata.name}
        icon={{ icon: <VolumesIcon size={48} /> }}
        padding={0}
        marginBottom="large"
      />
      <Select
        selectedKey={containerName}
        onSelectionChange={toContainerName => {
          navigate(`/pods/${pod?.metadata.namespace}/${pod?.metadata.name}/shell/${toContainerName}`)
        }}
      >
        {containers.map(container => {
          console.log('c', container)

          return (
            <ListBoxItem
              key={container?.name}
              label={container?.name}
              textValue={container?.name}
            >
              {container.name}
            </ListBoxItem>
          )
        })}
      </Select>
    </>
  )
}
