import { CardProps, Chip } from '@pluralsh/design-system'
import { Div, Flex } from 'honorable'
import { ReactNode } from 'react'
import type { LabelPair, Metadata as MetadataT } from 'generated/graphql'
import { MetadataCard } from 'components/utils/Metadata'

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

export function LabelsAnnotationsTag({ name, value }: LabelPair) {
  return (
    <Chip size="small">
      {name}
      {value && `: ${value}`}
    </Chip>
  )
}

export function LabelsAnnotations({
  metadata: { labels, annotations },
  ...props
}: {
  metadata: MetadataT
} & CardProps) {
  return (
    <MetadataCard {...props}>
      <Flex
        direction="column"
        gap="xlarge"
      >
        <LabelsAnnotationsRow name="Labels">
          {labels?.map(label => (
            <LabelsAnnotationsTag
              key={label?.name}
              {...label}
            />
          ))}
        </LabelsAnnotationsRow>
        <LabelsAnnotationsRow name="Annotations">
          {annotations?.map(annotation => (
            <LabelsAnnotationsTag
              key={annotation?.name}
              {...annotation}
            />
          ))}
        </LabelsAnnotationsRow>
      </Flex>
    </MetadataCard>
  )
}
