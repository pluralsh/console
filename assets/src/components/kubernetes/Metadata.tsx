import { Card, Chip } from '@pluralsh/design-system'
import { Div, Flex } from 'honorable'

export const mapify = tags => tags.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {})

export function MetadataRow({
  name,
  children,
}: {
  name: ReactNode
  children: ReactNode
}) {
  return (
    <Div>
      <Div
        body1
        bold
        marginBottom="small"
      >
        {name}
      </Div>
      <Flex
        direction="row"
        wrap
        gap="xsmall"
      >
        {children}
      </Flex>
    </Div>
  )
}

export function MetadataTag({ name, value, background }) {
  return <Chip>{name}</Chip>
}

export function Metadata({ metadata: { labels, annotations } }: Metadata) {
  return (
    <Card padding="xlarge">
      <Flex
        direction="column"
        gap="xlarge"
      >
        <MetadataRow name="Labels">
          {labels.map(({ name, value }) => (
            <MetadataTag
              key={name}
              name={name}
              value={value}
            />
          ))}
        </MetadataRow>
        <MetadataRow
          name="Annotations"
          final
        >
          {annotations.map(({ name, value }) => (
            <MetadataTag
              key={name}
              name={name}
              value={value}
            />
          ))}
        </MetadataRow>
      </Flex>
    </Card>
  )
}
