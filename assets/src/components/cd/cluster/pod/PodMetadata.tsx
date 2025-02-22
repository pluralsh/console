import { Card, Flex } from '@pluralsh/design-system'

import { LabelPairsSection } from 'components/utils/LabelPairsSection'
import { Pod } from 'generated/graphql'

import { useTheme } from 'styled-components'

export function PodMetadata({ pod }: { pod: Pod }) {
  const theme = useTheme()
  const { labels, annotations } = pod.metadata

  return (
    <Flex direction="column">
      <Card css={{ padding: theme.spacing.large }}>
        <Flex
          direction="column"
          gap="large"
        >
          <LabelPairsSection
            vals={labels}
            title="Labels"
          />
          <LabelPairsSection
            vals={annotations}
            title="Annotations"
          />
        </Flex>
      </Card>
    </Flex>
  )
}
