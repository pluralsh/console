import { IconFrameProps } from '@pluralsh/design-system'
import IconFrameRefreshButton from 'components/utils/RefreshIconFrame'
import { useRefreshInsightMutation, AiInsightFragment } from 'generated/graphql'

export function InsightRefresh({
  insight,
  size,
}: {
  insight: AiInsightFragment
  size?: IconFrameProps['size']
}) {
  const [mutation, { loading }] = useRefreshInsightMutation({
    variables: {
      id: insight.id,
    },
  })

  return (
    <IconFrameRefreshButton
      loading={loading}
      refetch={mutation}
      size={size}
    />
  )
}
