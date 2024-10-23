import { Button, Flex, ReloadIcon } from '@pluralsh/design-system'
import { useOutletContext } from 'react-router-dom'

import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import { CaptionP } from 'components/utils/typography/Text'
import { useTheme } from 'styled-components'
import { dateTimeFormat } from 'utils/date'
import { StackRunOutletContextT } from '../Route.tsx'

export function StackRunInsights() {
  const theme = useTheme()
  const { stackRun, refetch, loading } =
    useOutletContext<StackRunOutletContextT>()
  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
    >
      <Flex
        justify="space-between"
        gap="small"
        paddingLeft={theme.spacing.medium}
        paddingRight={theme.spacing.medium}
      >
        <CaptionP
          css={{ width: 'max-content' }}
          $color="text-xlight"
        >
          {stackRun.insight?.updatedAt &&
            `Last updated ${dateTimeFormat(stackRun.insight?.updatedAt)}`}
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
      <InsightDisplay text={stackRun.insight?.text} />
    </Flex>
  )
}
