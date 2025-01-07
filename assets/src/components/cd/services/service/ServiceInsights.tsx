import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'

import moment from 'moment/moment'
import { useMemo } from 'react'

import { useParams } from 'react-router-dom'

import { CD_REL_PATH } from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'
import { AiInsight } from '../../../../generated/graphql.ts'
import AIPinButton from '../../../ai/AIPinButton.tsx'
import { AISuggestFix } from '../../../ai/chatbot/AISuggestFix.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../../ai/chatbot/ChatbotButton.tsx'
import IconFrameRefreshButton from '../../../utils/RefreshIconFrame.tsx'
import { StackedText } from '../../../utils/table/StackedText.tsx'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'
import { InsightDisplay } from '../../../ai/InsightDisplay.tsx'

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
        <StackedText
          first="Insight"
          firstPartialType="body1Bold"
          second={
            service.insight?.updatedAt &&
            `Last updated ${moment(service.insight?.updatedAt).fromNow()}`
          }
        />
        <Flex
          align="center"
          gap="small"
        >
          <IconFrameRefreshButton
            loading={loading}
            refetch={refetch}
          />
          <AIPinButton insight={service?.insight as AiInsight} />
          <ChatWithAIButton
            floating
            insightId={service?.insight?.id}
            messages={[insightMessage(service?.insight)]}
          />
          <AISuggestFix insight={service?.insight} />
        </Flex>
      </Flex>
      <InsightDisplay
        text={service.insight?.text}
        kind="service"
      />
    </Flex>
  )
}
