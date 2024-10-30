import { IconFrame, ReloadIcon, Spinner } from '@pluralsh/design-system'
import { Dispatch, ReactNode } from 'react'

interface RefreshIconFrameButtonProps {
  refetch: Dispatch<void>
  loading?: boolean
}

export default function IconFrameRefreshButton({
  refetch,
  loading,
}: RefreshIconFrameButtonProps): ReactNode {
  return (
    <IconFrame
      clickable
      type="floating"
      size="large"
      onClick={() => refetch()}
      background="fill-zero"
      icon={
        loading ? (
          <Spinner
            css={{
              width: 16,
              height: 16,
              '&::before': {
                width: 16,
                height: 16,
                marginTop: -8,
                marginLeft: -8,
              },
            }}
          />
        ) : (
          <ReloadIcon
            css={{
              width: 16,
            }}
          />
        )
      }
    />
  )
}
