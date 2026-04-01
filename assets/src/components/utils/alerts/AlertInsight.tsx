import {
  Button,
  ButtonProps,
  EmptyState,
  Flex,
  ReturnIcon,
} from '@pluralsh/design-system'
import { useAiInsightQuery } from 'generated/graphql'
import { Link, useParams } from 'react-router-dom'
import { fromNow } from 'utils/datetime'

import { AISuggestFix } from 'components/ai/chatbot/AISuggestFix'
import {
  ChatWithAIButton,
  insightMessage,
} from 'components/ai/chatbot/ChatbotButton'
import { InsightDisplay } from 'components/ai/insights/InsightDisplay'
import {
  PageHeaderContext,
  POLL_INTERVAL,
} from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import IconFrameRefreshButton from 'components/utils/RefreshIconFrame'
import { StackedText } from 'components/utils/table/StackedText'
import { ComponentPropsWithoutRef, use, useLayoutEffect, useMemo } from 'react'
import {
  getClusterDetailsPath,
  getServiceDetailsPath,
  SERVICE_OBSERVABILITY_REL_PATH,
} from 'routes/cdRoutesConsts'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts'
import styled from 'styled-components'
import { StretchedFlex } from '../StretchedFlex'

export function AlertInsight({
  type,
}: {
  type: 'cluster' | 'service' | 'flow'
}) {
  const { clusterId, serviceId, flowIdOrName, insightId } = useParams()

  const { data, loading, error, refetch } = useAiInsightQuery({
    variables: { id: insightId ?? '' },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const insight = data?.aiInsight
  const alert = insight?.alert

  const backButtonPath = useMemo(
    () =>
      type === 'cluster'
        ? `${getClusterDetailsPath({ clusterId })}/alerts`
        : type === 'service'
          ? `${getServiceDetailsPath({ clusterId, serviceId, flowIdOrName })}/${SERVICE_OBSERVABILITY_REL_PATH}/alerts`
          : `${getFlowDetailsPath({ flowIdOrName })}/alerts`,
    [clusterId, flowIdOrName, serviceId, type]
  )

  const pageHeaderCtx = type === 'service' ? use(PageHeaderContext) : null
  useLayoutEffect(() => {
    if (pageHeaderCtx) {
      pageHeaderCtx.setHeaderContent(
        <BackButton
          small
          path={backButtonPath}
        />
      )
      return () => pageHeaderCtx.setHeaderContent(null)
    }
  }, [pageHeaderCtx, backButtonPath])

  const alertSummary = (
    <StackedText
      truncate
      css={{
        maxWidth: '50%',
        marginRight: type === 'service' ? 'auto' : undefined,
      }}
      first={alert?.title}
      firstPartialType="body1Bold"
      firstColor="text"
      second={alert?.message}
      loading={!data && loading}
    />
  )
  if (error && !error?.message?.includes('could not find resource'))
    return <GqlError error={error} />
  if (!(data || loading))
    return (
      <EmptyState message="Insight not found">
        <BackButton path={backButtonPath} />
      </EmptyState>
    )

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
    >
      {type !== 'service' && (
        <StretchedFlex>
          <BackButton path={backButtonPath} />
          {alertSummary}
        </StretchedFlex>
      )}
      <Flex
        gap="small"
        align="center"
        whiteSpace="nowrap"
      >
        {type === 'service' ? (
          alertSummary
        ) : (
          <StackedText
            first="Insight"
            firstPartialType="body1Bold"
            firstColor="text"
            second={
              insight?.updatedAt && `Last updated ${fromNow(insight.updatedAt)}`
            }
            css={{ flex: 1 }}
          />
        )}
        <IconFrameRefreshButton
          loading={loading}
          refetch={refetch}
        />
        <ChatWithAIButton
          floating
          insightId={insight?.id}
          messages={[insightMessage(insight)]}
        />
        <AISuggestFix insight={insight} />
      </Flex>
      <InsightDisplay
        insight={insight}
        kind="alert"
        loading={loading}
      />
    </Flex>
  )
}

export function FullPageAlertInsight(
  props: ComponentPropsWithoutRef<typeof AlertInsight>
) {
  return (
    <FullPageAlertInsightSC>
      <AlertInsight {...props} />
    </FullPageAlertInsightSC>
  )
}

function BackButton({ path, ...props }: { path: string } & ButtonProps) {
  return (
    <Button
      as={Link}
      to={path}
      floating
      startIcon={<ReturnIcon />}
      {...props}
    >
      Back to alerts
    </Button>
  )
}

const FullPageAlertInsightSC = styled.div(({ theme }) => ({
  height: '100%',
  padding: theme.spacing.large,
}))
