import { useQuery } from '@tanstack/react-query'
import { Code } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'

async function fetchPatch(patchUrl: string) {
  const response = await fetch(patchUrl)

  if (!response.ok) {
    throw new Error(`Unable to fetch diff: ${response.statusText}`)
  }

  return response.text()
}

export function AgentRunDiff({ patchUrl }: { patchUrl: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['agent-run-patch', patchUrl],
    queryFn: () => fetchPatch(patchUrl),
    enabled: !!patchUrl,
  })

  if (isLoading) {
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

  if (!data?.trim()) {
    return <CaptionP $color="text-light">No diff content available.</CaptionP>
  }

  return (
    <Code
      height="100%"
      language="diff"
      showHeader={false}
      showLineNumbers
      title="patch.diff"
    >
      {data}
    </Code>
  )
}
