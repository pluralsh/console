import IconFrameRefreshButton from 'components/utils/RefreshIconFrame'
import { useRefreshInsightMutation, AiInsightFragment } from 'generated/graphql'

export function InsightRefresh({ insight }: { insight: AiInsightFragment }) {
  const [mutation, { loading }] = useRefreshInsightMutation({
    variables: {
      id: insight.id,
    },
  })

  return (
    <IconFrameRefreshButton
      loading={loading}
      refetch={mutation}
    />
  )
}
