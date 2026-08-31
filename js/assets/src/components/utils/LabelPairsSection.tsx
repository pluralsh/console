import { Chip } from '@pluralsh/design-system'
import { LabelPair, Maybe } from 'generated/graphql'
import styled from 'styled-components'

const Heading = styled.h3(({ theme }) => ({
  ...theme.partials.text.body1Bold,
  marginBottom: theme.spacing.medium,
}))

const List = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xsmall,
  color: theme.colors['text-xlight'],
}))

export function LabelPairsSection({
  vals,
  title,
}: {
  vals?: Maybe<Maybe<LabelPair>[]>
  title: string
}) {
  return (
    <div>
      <Heading>{title}</Heading>
      <List>
        {!vals || vals.length === 0
          ? `There are no ${title.toLowerCase()}.`
          : vals.map(
              (pair, i) =>
                pair && (
                  <Chip key={i}>
                    {pair.name && `${pair.name}: `} {pair.value}
                  </Chip>
                )
            )}
      </List>
    </div>
  )
}
