import { IconFrame, ReloadIcon, Spinner } from '@pluralsh/design-system'
import { useCallback, useRef, useState } from 'react'

export default function IconFrameRefreshButton({
  refetch,
  loading,
}: {
  refetch: () => void
  loading?: boolean
}) {
  const [clickedRecently, setClickedRecently] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const handleClick = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    refetch()
    setClickedRecently(true)
    timeoutRef.current = setTimeout(() => setClickedRecently(false), 2500)
  }, [refetch])

  return (
    <IconFrame
      clickable
      type="secondary"
      size="large"
      tooltip="Refetch data"
      onClick={handleClick}
      disabled={loading}
      icon={
        clickedRecently && loading ? (
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
