import { Button, Flex, ReloadIcon } from '@pluralsh/design-system'
import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import { CaptionP } from 'components/utils/typography/Text'
import { useOutletContext } from 'react-router-dom'
import { dateTimeFormat } from 'utils/date'
import { ComponentDetailsContext } from './ComponentDetails.tsx'

export function ComponentInsights() {
  const { component, refetch, loading } =
    useOutletContext<ComponentDetailsContext>()

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      maxHeight="100%"
    >
      <Flex
        align={'center'}
        justify="space-between"
        gap="small"
      >
        <CaptionP
          css={{ width: 'max-content' }}
          $color="text-xlight"
        >
          {component.insight?.updatedAt &&
            `Last updated at ${dateTimeFormat(component.insight?.updatedAt)}`}
        </CaptionP>
        <Button
          floating
          startIcon={<ReloadIcon />}
          onClick={() => refetch()}
          loading={loading}
        >
          Refresh insights
        </Button>
      </Flex>
      <InsightDisplay text={component.insight?.text} />
    </Flex>
  )
}
