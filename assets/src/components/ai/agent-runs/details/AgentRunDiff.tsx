import { useQuery } from '@tanstack/react-query'
import { Card, Code } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'

async function fetchPatch(patchUrl: string) {
  const { host, pathname, search } = new URL(patchUrl)
  const response = await fetch(`/__object_store/${host}${pathname}${search}`)

  if (!response.ok) {
    throw new Error(
      `Unable to fetch diff (${response.status} ${response.statusText})`
    )
  }

  return response.text()
}

export function AgentRunDiff({
  runId,
  patchUrl,
}: {
  runId: string
  patchUrl: string
}) {
  const {
    data: content,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['agent-run-patch', runId],
    queryFn: () => fetchPatch(patchUrl),
    enabled: !!runId && !!patchUrl,
    staleTime: Infinity,
  })

  if (isLoading && !content) {
    return (
      <RectangleSkeleton
        $height={200}
        $width="100%"
      />
    )
  }

  if (error) {
    return (
      <GqlError
        header="Unable to load diff."
        error={error}
      />
    )
  }

  if (!content?.trim()) {
    return <CaptionP $color="text-light">No diff content available.</CaptionP>
  }

  return (
    <Code
      language="diff"
      showHeader={false}
      showLineNumbers
      title="patch.diff"
    >
      {content}
    </Code>
  )
}
