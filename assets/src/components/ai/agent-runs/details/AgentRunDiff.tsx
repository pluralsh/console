import { useQuery } from '@tanstack/react-query'
import { Card } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import styled from 'styled-components'

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
    <DiffCardSC>
      <DiffPreSC>{data}</DiffPreSC>
    </DiffCardSC>
  )
}

const DiffCardSC = styled(Card)(({ theme }) => ({
  overflow: 'auto',
  padding: theme.spacing.medium,
  maxHeight: '100%',
}))

const DiffPreSC = styled.pre(({ theme }) => ({
  ...theme.partials.text.code,
  margin: 0,
  whiteSpace: 'pre',
  color: theme.colors.text,
}))
