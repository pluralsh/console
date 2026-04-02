import { Button, FileDiffIcon, IconFrame, Modal } from '@pluralsh/design-system'
import DiffViewer from 'components/utils/DiffViewer'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body2P } from 'components/utils/typography/Text'
import { WorkbenchJobActivityFragment } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { DiffMethod } from 'react-diff-viewer'
import { getOldContentFromTextDiff } from 'utils/textDiff'

type ActivityResult = NonNullable<WorkbenchJobActivityFragment['result']>

export function MemoActivityResult({
  result: { jobUpdate, output },
}: {
  result: ActivityResult
}) {
  const [showDiff, setShowDiff] = useState(false)

  const newValue = jobUpdate?.workingTheory ?? jobUpdate?.conclusion ?? ''
  const oldValue = useMemo(
    () => getOldContentFromTextDiff(newValue, jobUpdate?.diff),
    [newValue, jobUpdate?.diff]
  )

  return (
    <StretchedFlex gap="medium">
      <Body2P $color="text-xlight">{output}</Body2P>
      {!!jobUpdate?.diff && (
        <>
          <IconFrame
            clickable
            icon={<FileDiffIcon color="icon-light" />}
            size="small"
            tooltip="View diff"
            onClick={() => setShowDiff(true)}
          />
          <Modal
            header={`Updated ${jobUpdate?.workingTheory ? 'working theory' : 'conclusion'}`}
            size="auto"
            open={showDiff}
            onClose={() => setShowDiff(false)}
            actions={
              <Button
                secondary
                onClick={() => setShowDiff(false)}
              >
                Close
              </Button>
            }
          >
            <DiffViewer
              compareMethod={DiffMethod.WORDS}
              oldValue={oldValue}
              newValue={newValue}
            />
          </Modal>
        </>
      )}
    </StretchedFlex>
  )
}
