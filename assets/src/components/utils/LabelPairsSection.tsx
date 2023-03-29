import { Chip } from '@pluralsh/design-system'
import { Flex, H3 } from 'honorable'
import { LabelPair, Maybe } from 'generated/graphql'

export function LabelPairsSection({
  vals,
  title,
}: {
  vals?: Maybe<Maybe<LabelPair>[]>
  title: string
}) {
  return (
    <div>
      <H3
        body1
        fontWeight={600}
        marginBottom="medium"
      >
        {title}
      </H3>
      <Flex
        gap="xsmall"
        wrap="wrap"
      >
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
      </Flex>
    </div>
  )
}
