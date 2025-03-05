import {
  Button,
  Flex,
  IconFrame,
  PrOpenIcon,
  ReturnIcon,
} from '@pluralsh/design-system'
import DiffViewer from 'components/utils/DiffViewer'
import { StackedText } from 'components/utils/table/StackedText'
import { PullRequestEvidenceFragment } from 'generated/graphql'
import { getURLPath } from 'utils/url'
import { useMemo } from 'react'
import { reversePatch, applyPatch, parsePatch } from 'diff'

export function PrEvidenceDetails({
  pr: { contents, patch, filename, url },
  onGoBack,
}: {
  pr: PullRequestEvidenceFragment
  onGoBack: () => void
}) {
  // contents is actually the post-patch content, so we need to reverse the patch to get the old content
  const oldContent = useMemo(
    () => applyPatch(contents, reversePatch(parsePatch(patch))),
    [contents, patch]
  )

  return (
    <Flex
      gap="medium"
      direction="column"
      height="100%"
    >
      <Flex
        gap="small"
        justify="space-between"
      >
        <Button
          floating
          width="fit-content"
          startIcon={<ReturnIcon />}
          onClick={() => onGoBack()}
        >
          Back to main view
        </Button>
        <Flex
          gap="small"
          align="center"
        >
          <IconFrame
            type="floating"
            size="large"
            css={{ flexShrink: 0 }}
            icon={<PrOpenIcon color="icon-light" />}
          />
          <StackedText
            firstColor="text"
            first={filename}
            second={getURLPath(url)}
          />
        </Flex>
      </Flex>
      <DiffViewer
        oldTitle={`${filename || ''} (original)`}
        oldValue={oldContent || ''}
        newTitle={`${filename || ''} (changed)`}
        newValue={contents || ''}
      />
    </Flex>
  )
}
