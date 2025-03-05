import {
  Accordion,
  AccordionItem,
  CloseIcon,
  DropdownArrowIcon,
  FileIcon,
  Flex,
  IconFrame,
  PrOpenIcon,
} from '@pluralsh/design-system'
import DiffViewer from 'components/utils/DiffViewer'
import { StackedText } from 'components/utils/table/StackedText'
import { applyPatch, parsePatch, reversePatch } from 'diff'
import { useMemo } from 'react'
import { DiffMethod } from 'react-diff-viewer'
import styled from 'styled-components'
import pluralize from 'pluralize'
import { getURLPath } from 'utils/url'
import { GroupedPrEvidence } from './PrEvidencePanel'

export function PrEvidenceDetails({
  pr: { url, title, files },
  onGoBack,
}: {
  pr: GroupedPrEvidence
  onGoBack: () => void
}) {
  // 'contents' is actually the post-patch content, so we need to reverse the patch to get the old content
  const fileDiffs = useMemo(
    () =>
      files.map((file) => ({
        filename: file.filename,
        newContent: file.contents ?? '',
        ...getOldContent(file.contents, file.patch),
      })),
    [files]
  )

  return (
    <WrapperSC>
      <Flex
        gap="small"
        justify="space-between"
      >
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
            first={getURLPath(url)}
            second={title}
          />
        </Flex>
        <IconFrame
          clickable
          tooltip="Close"
          size="large"
          icon={<CloseIcon />}
          onClick={() => onGoBack()}
        />
      </Flex>
      {fileDiffs.map(({ filename, oldContent, newContent, numChanges }, i) => (
        <Accordion
          type="single"
          key={i}
        >
          <AccordionItem
            caret="none"
            padding="none"
            trigger={
              <ItemHeader
                filename={filename ?? ''}
                numChanges={numChanges}
              />
            }
            css={{ '& *': { animationDuration: '0s !important' } }}
          >
            <DiffViewer
              asCard={false}
              compareMethod={DiffMethod.WORDS}
              oldValue={oldContent || ''}
              newValue={newContent || ''}
            />
          </AccordionItem>
        </Accordion>
      ))}
    </WrapperSC>
  )
}

function ItemHeader({
  filename,
  numChanges,
}: {
  filename: string
  numChanges: number
}) {
  return (
    <ItemHeaderSC>
      <Flex gap="small">
        <FileIcon />
        <span>{filename}</span>
      </Flex>
      <Flex gap="small">
        <span>
          {numChanges} {pluralize('change', numChanges)}
        </span>
        <AccordionCaretSC />
      </Flex>
    </ItemHeaderSC>
  )
}

const ItemHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: theme.colors['fill-three'],
  '&:hover': { backgroundColor: theme.colors['fill-three-hover'] },
  width: '100%',
  height: 48,
  padding: theme.spacing.medium,
}))

const AccordionCaretSC = styled(DropdownArrowIcon)({
  transition: 'transform 0.3s ease-in-out',
  'button[data-state="open"] &': { transform: 'scaleY(-1)' },
})

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  height: '100%',
  padding: theme.spacing.xsmall,
  width: 850,
}))

const getOldContent = (
  newContent: Nullable<string>,
  patch: Nullable<string>
): { numChanges: number; oldContent: string } => {
  const patchObj = parsePatch(patch ?? '')
  try {
    return {
      numChanges: patchObj?.[0]?.hunks?.length ?? 0,
      oldContent: applyPatch(newContent ?? '', reversePatch(patchObj)) ?? '',
    }
  } catch (error) {
    console.error('Error applying reverse patch:', error)
    return {
      numChanges: 0,
      oldContent: newContent ?? '',
    }
  }
}
