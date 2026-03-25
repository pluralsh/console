import { Flex } from '@pluralsh/design-system'
import { SimplifiedMarkdown } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { OverlineH3 } from 'components/utils/typography/Text'
import { WorkbenchJobResultFragment } from 'generated/graphql'
import styled from 'styled-components'

export function WorkbenchJobResult({
  loading,
  result,
}: {
  loading: boolean
  result: Nullable<WorkbenchJobResultFragment>
}) {
  if (loading)
    return (
      <RectangleSkeleton
        css={{ height: 320 }}
        $height={320}
        $width="100%"
      />
    )

  const body = result?.conclusion || result?.workingTheory || 'No output yet.'

  return (
    <ResultPanelSC>
      <OverlineH3 $color="text-xlight">
        {result?.conclusion ? 'Conclusion' : 'Working theory'}
      </OverlineH3>
      <Flex
        direction="column"
        overflow="auto"
      >
        <SimplifiedMarkdown text={body} />
      </Flex>
    </ResultPanelSC>
  )
}

const ResultPanelSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  position: 'relative',
  overflow: 'hidden',
  padding: theme.spacing.large,
  '&::before': {
    borderRadius: theme.borderRadiuses.large,
    content: '""',
    position: 'absolute',
    inset: 0,
    padding: 1,
    pointerEvents: 'none',
    background:
      'linear-gradient(117deg, rgba(97,112,255,0.95) 0%, rgba(227,169,102,0.95) 100%)',
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'exclude',
  },
}))
