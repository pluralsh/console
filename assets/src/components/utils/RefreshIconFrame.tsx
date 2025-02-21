import { IconFrame, ReloadIcon, Spinner } from '@pluralsh/design-system'

interface RefreshIconFrameButtonProps {
  refetch: () => void
  loading?: boolean
}

export default function IconFrameRefreshButton({
  refetch,
  loading,
}: RefreshIconFrameButtonProps) {
  return (
    <IconFrame
      clickable
      type="secondary"
      size="large"
      onClick={() => refetch()}
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
