import { Card, Chip } from '@pluralsh/design-system'
import { Div, Flex } from 'honorable'
import { ReactNode } from 'react'
import type { Metadata as MetadataT } from 'generated/graphql'

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

export function MetadataTag({ name }) {
  return <Chip>{name}</Chip>
}

export function Metadata({
  metadata: { labels, annotations },
}: {
  metadata: MetadataT
}) {
  return (
    <Card padding="xlarge">
      <Flex
        direction="column"
        gap="xlarge"
      >
        <MetadataRow name="Labels">
          {labels?.map(label => (
            <MetadataTag
              key={label?.name}
              name={label?.name}
            />
          ))}
        </MetadataRow>
        <MetadataRow name="Annotations">
          {annotations?.map(annotation => (
            <MetadataTag
              key={annotation?.name}
              name={annotation?.name}
            />
          ))}
        </MetadataRow>
      </Flex>
    </Card>
  )
}
