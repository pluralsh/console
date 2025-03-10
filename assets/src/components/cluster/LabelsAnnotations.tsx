import { CardProps, ChipList, Flex } from '@pluralsh/design-system'
import { CARD_CONTENT_MAX_WIDTH, MetadataCard } from 'components/utils/Metadata'
import type { LabelPair, Maybe, Metadata as MetadataT } from 'generated/graphql'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'

export const mapify = (tags) =>
  tags.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {})

export function LabelsAnnotationsRow({
  name,
  children,
}: {
  name: ReactNode
  children: ReactNode
}) {
  const theme = useTheme()
  return (
    <div>
      <div
        css={{
          ...theme.partials.text.body1Bold,
          marginBottom: theme.spacing.small,
        }}
      >
        {name}
      </div>
      <Flex
        direction="row"
        wrap
        gap="xsmall"
      >
        {children}
      </Flex>
    </div>
  )
}

export function renderLabel(label: Maybe<LabelPair>) {
  return (
    <>
      {label?.name}
      {label?.value && `: ${label.value}`}
    </>
  )
}

export function LabelsAnnotations({
  metadata: { labels, annotations },
  ...props
}: {
  metadata: MetadataT
} & CardProps) {
  const theme = useTheme()

  const hasLabels = labels && labels?.length > 0
  const hasAnnotations = annotations && annotations.length > 0
  const hasData = hasLabels || hasAnnotations

  if (!hasData) {
    return null
  }

  return (
    <MetadataCard {...props}>
      <Flex
        direction="column"
        gap="xlarge"
        maxWidth={(CARD_CONTENT_MAX_WIDTH - theme.spacing.xlarge * 3) / 2}
      >
        {hasLabels && (
          <LabelsAnnotationsRow name="Labels">
            <ChipList
              size="small"
              limit={8}
              values={labels}
              transformValue={renderLabel}
            />
          </LabelsAnnotationsRow>
        )}
        {hasAnnotations && (
          <LabelsAnnotationsRow name="Annotations">
            <ChipList
              size="small"
              limit={8}
              values={annotations}
              transformValue={renderLabel}
            />
          </LabelsAnnotationsRow>
        )}
      </Flex>
    </MetadataCard>
  )
}
