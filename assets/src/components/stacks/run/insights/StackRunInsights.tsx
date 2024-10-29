import { Flex } from '@pluralsh/design-system'

import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import { CaptionP } from 'components/utils/typography/Text'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { dateTimeFormat } from 'utils/date'
import { AISuggestFix } from '../../../ai/AISuggestFix.tsx'
import IconFrameRefreshButton from '../../../utils/RefreshIconFrame.tsx'
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
      height="100%"
    >
      <Flex
        align="center"
        justify="flex-end"
        gap="small"
        paddingLeft={theme.spacing.medium}
      >
        <CaptionP
          css={{ width: 'max-content' }}
          $color="text-xlight"
        >
          {stackRun.insight?.updatedAt &&
            `Last updated ${dateTimeFormat(stackRun.insight?.updatedAt)}`}
        </CaptionP>
        <IconFrameRefreshButton
          loading={loading}
          refetch={refetch}
        />
        <AISuggestFix insight={stackRun?.insight} />
      </Flex>
      <InsightDisplay text={stackRun.insight?.text} />
    </Flex>
  )
}
