import { Card, Flex } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Body2P } from 'components/utils/typography/Text'
import { useTheme } from 'styled-components'

export function AISettingsAIInsights() {
  const theme = useTheme()

  return (
    <ScrollablePage>
      <Flex
        direction="column"
        gap="medium"
      >
        <Card
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
            padding: theme.spacing.xlarge,
          }}
        >
          <Body2P $color="text-xlight">...</Body2P>
        </Card>
      </Flex>
    </ScrollablePage>
  )
}
