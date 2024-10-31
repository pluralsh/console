import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'

import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'
import { CaptionP } from 'components/utils/typography/Text'
import moment from 'moment/moment'
import { useMemo } from 'react'

import { useParams } from 'react-router-dom'

import { CD_REL_PATH } from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'
import { AISuggestFix } from '../../../ai/AISuggestFix.tsx'
import { ChatWithAIButton } from '../../../ai/chatbot/ChatbotButton.tsx'
import IconFrameRefreshButton from '../../../utils/RefreshIconFrame.tsx'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

export function ServiceInsights() {
  const theme = useTheme()
  const { service, refetch, loading } = useServiceContext()
  const { serviceId, clusterId } = useParams()

  const breadcrumbs = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        cluster: service?.cluster || { id: clusterId || '' },
        service: service || { id: serviceId || '' },
      }),
      {
        label: 'insights',
        url: `${CD_REL_PATH}/services/${serviceId}/insights`,
      },
    ],
    [clusterId, service, serviceId]
  )

  useSetBreadcrumbs(breadcrumbs)

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      marginBottom={theme.spacing.large}
      height="100%"
    >
      <Flex
        justify="space-between"
        alignItems="center"
      >
        <ConsolePageTitle heading="Insights" />
        <Flex
          align="center"
          gap="small"
        >
          <CaptionP
            css={{ width: 'max-content' }}
            $color="text-xlight"
          >
            {service.insight?.updatedAt &&
              `Last updated ${moment(service.insight?.updatedAt).fromNow()}`}
          </CaptionP>
          <IconFrameRefreshButton
            loading={loading}
            refetch={refetch}
          />
          <ChatWithAIButton
            floating
            insight={service?.insight}
          />
          <AISuggestFix insight={service?.insight} />
        </Flex>
      </Flex>
      <InsightDisplay text={service.insight?.text} />
    </Flex>
  )
}
