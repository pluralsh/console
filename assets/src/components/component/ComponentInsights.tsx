import { Flex } from '@pluralsh/design-system'
import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import { CaptionP } from 'components/utils/typography/Text'
import { ServiceDeploymentComponentFragment } from 'generated/graphql'
import { useOutletContext } from 'react-router-dom'
import { dateTimeFormat } from 'utils/date'

export function ComponentInsights() {
  const { component } = useOutletContext<{
    component: ServiceDeploymentComponentFragment
  }>()

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      maxHeight="100%"
    >
      <Flex
        justify="space-between"
        gap="small"
      >
        <CaptionP
          css={{ width: 'max-content' }}
          $color="text-xlight"
        >
          {component.insight?.updatedAt &&
            `Last updated ${dateTimeFormat(component.insight?.updatedAt)}`}
        </CaptionP>
        {/* TODO: Add refresh button here */}
      </Flex>
      <InsightDisplay text={component.insight?.text} />
    </Flex>
  )
}
