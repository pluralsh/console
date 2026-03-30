import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { MonitorAttributes } from 'generated/graphql'

export function ServiceMonitorForm({
  state: _,
  isLoading,
}: {
  state: MonitorAttributes
  isLoading: boolean
}) {
  if (isLoading)
    return (
      <RectangleSkeleton
        $width="100%"
        $height="100%"
      />
    )
  return <div>ServiceMonitorForm</div>
}
