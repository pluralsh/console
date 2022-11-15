import {
  A,
  Button,
  Div,
  Flex,
  Span,
} from 'honorable'
import { useCallback, useState } from 'react'

import { Checklist, ChecklistStateProps } from '../components/Checklist'
import { ChecklistItem } from '../components/ChecklistItem'
import DownloadIcon from '../components/icons/DownloadIcon'
import GitHubLogoIcon from '../components/icons/GitHubLogoIcon'
import MarketIcon from '../components/icons/MarketIcon'
import SourcererIcon from '../components/icons/SourcererIcon'
import TerminalIcon from '../components/icons/TerminalIcon'

export default {
  title: 'Checklist',
  component: Checklist,
}

function Template() {
  const [selected, setSelected] = useState<number>(0)
  const [focused, setFocused] = useState<number>(-1)
  const [completed, setCompleted] = useState<number>(-1)
  const [open, setOpen] = useState<boolean>(true)
  const [dismiss, setDismiss] = useState(false)
  const checklistStateProps: ChecklistStateProps = {
    onSelectionChange: setSelected,
    onFocusChange: setFocused,
    onOpenChange: setOpen,
    selectedKey: selected,
    focusedKey: focused,
    completedKey: completed,
    isOpen: open,
    isDismissed: dismiss,
  }

  const isCompleted = useCallback(() => completed >= selected, [completed, selected])
  const canComplete = useCallback(() => Math.abs(selected - completed) === 1, [selected, completed])

  const completeButton = (
    <Button
      small
      onClick={() => {
        setCompleted(selected)
        setSelected(selected + 1)
        setFocused(selected + 1)
      }}
      disabled={isCompleted() || !canComplete()}
    >Mark as done
    </Button>
  )

  return (
    <Flex
      grow={1}
      justify="center"
      style={{
        bottom: 0,
        position: 'fixed',
      }}
    >
      <Checklist
        label="Getting Started"
        stateProps={checklistStateProps}
        footerChildren={(
          <Flex
            gap="small"
          >
            <Button
              secondary
              small
            >Support
            </Button>

            <Button
              secondary
              small
            >Docs
            </Button>

            <Button
              secondary
              small
            >GitHub
            </Button>

            <Flex flex="1" />

            <Button
              small
              tertiary
              padding="none"
              onClick={() => setDismiss(true)}
            >Dismiss
            </Button>
          </Flex>
        )}
        completeChildren={(
          <Flex
            direction="column"
            gap="medium"
          >
            <Flex
              paddingHorizontal="large"
              gap="medium"
            >
              <SourcererIcon />
              <Flex
                gap="xxsmall"
                direction="column"
              >
                <Span subtitle1>Congratulations!</Span>
                <Span body2>You're well on your way to becoming an open-sourcerer.</Span>
              </Flex>
            </Flex>
            <Div
              height={1}
              backgroundColor="border-input"
            />
            <Flex
              gap="small"
              paddingHorizontal="large"
            >
              <Button
                small
                secondary
                startIcon={<GitHubLogoIcon />}
              >Star us on GitHub
              </Button>
              <Flex grow={1} />
              <Button
                small
                secondary
                onClick={() => {
                  setCompleted(-1)
                  setSelected(0)
                }}
              >Restart
              </Button>
              <Button
                small
                onClick={() => setDismiss(true)}
              >Complete
              </Button>
            </Flex>
          </Flex>
        )}
      >
        <ChecklistItem title="Setup on your own cloud">
          <Flex
            direction="column"
            gap="medium"
          >
            <Span>
              If you'd prefer to use Plural on your local machine, get started with the <A inline>Plural CLI</A>.
            </Span>
            <Flex gap="small">
              <Button
                small
                secondary
                startIcon={<TerminalIcon />}
                onClick={() => setOpen(false)}
              >Launch Cloud Shell
              </Button>
              {completeButton}
            </Flex>
          </Flex>
        </ChecklistItem>

        <ChecklistItem title="Install Plural Console">
          <Flex
            direction="column"
            gap="medium"
          >
            This will enable out-of-the-box monitoring, scaling, and security for all your applications.
            <Flex gap="small">
              <Button
                small
                secondary
                startIcon={<DownloadIcon />}
              >Install
              </Button>

              {completeButton}
            </Flex>
          </Flex>
        </ChecklistItem>
        <ChecklistItem title="Install another app">
          <Flex
            gap="small"
          >
            <Button
              small
              secondary
              startIcon={<MarketIcon />}
            >View marketplace
            </Button>

            {completeButton}
          </Flex>
        </ChecklistItem>
      </Checklist>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {}
