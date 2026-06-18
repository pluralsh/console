import { CloseIcon, IconFrame } from '@pluralsh/design-system'
import {
  PanelHeaderSC,
  SidePanelContent,
} from 'components/ai/chatbot/SidePanelShared'
import {
  SidePanel,
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanel'
import { isNil } from 'lodash'
import { useEffect, useEffectEvent } from 'react'

const SIDE_PANEL_TYPE: SidePanel = 'agent-run'

export function AgentRunPanelContent() {
  const { setOpen } = useAgentRunPanel()

  return (
    <SidePanelContent>
      <PanelHeaderSC>
        <IconFrame
          clickable
          css={{ flexShrink: 0, marginLeft: 'auto' }}
          icon={<CloseIcon />}
          onClick={() => setOpen(false)}
          tooltip="Close panel"
        />
      </PanelHeaderSC>
    </SidePanelContent>
  )
}

export function useAgentRunPanel(autoOpen?: Nullable<boolean>) {
  const { sidePanel, setSidePanel } = useTopLevelSidePanel()
  const isOpen = sidePanel === SIDE_PANEL_TYPE
  const setOpen = (open: boolean) => setSidePanel(open ? SIDE_PANEL_TYPE : null)

  const onAutoOpen = useEffectEvent(() => setOpen(true))
  const onUnmount = useEffectEvent(() => setOpen(false))
  useEffect(() => {
    if (!!autoOpen) onAutoOpen()
    return () => {
      if (!isNil(autoOpen)) onUnmount()
    }
  }, [autoOpen])

  return { isOpen, setOpen }
}
