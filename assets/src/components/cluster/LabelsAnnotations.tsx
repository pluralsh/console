import { Card, CardProps, Chip } from '@pluralsh/design-system'
import { Div, Flex } from 'honorable'
import { ReactNode } from 'react'
import type { Metadata as MetadataT } from 'generated/graphql'

export const mapify = tags => tags.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {})

export function LabelsAnnotationsRow({
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

export function LabelsAnnotationsTag({ name }) {
  return <Chip>{name}</Chip>
}

export function LabelsAnnotations({
  metadata: { labels, annotations },
  ...props
}: {
  metadata: MetadataT
} & CardProps) {
  return (
    <Card
      padding="xlarge"
      {...props}
    >
      <Flex
        direction="column"
        gap="xlarge"
      >
        <LabelsAnnotationsRow name="Labels">
          {labels?.map(label => (
            <LabelsAnnotationsTag
              key={label?.name}
              name={label?.name}
            />
          ))}
        </LabelsAnnotationsRow>
        <LabelsAnnotationsRow name="Annotations">
          {annotations?.map(annotation => (
            <LabelsAnnotationsTag
              key={annotation?.name}
              name={annotation?.name}
            />
          ))}
        </LabelsAnnotationsRow>
      </Flex>
    </Card>
  )
}
