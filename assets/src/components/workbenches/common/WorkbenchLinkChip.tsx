import {
  Chip,
  useFloatingDropdown,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { FloatingPortal } from '@floating-ui/react-dom-interactions'
import {
  useWorkbenchLinkCardPendingAgentRunsQuery,
  useWorkbenchLinkCardQuery,
} from 'generated/graphql'
import { ComponentProps, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import {
  WorkbenchLinkHoverCard,
  WORKBENCH_LINK_HOVER_CARD_WIDTH,
} from './WorkbenchLinkHoverCard'

export const WORKBENCH_LINK_HOVER_CARD_SELECTOR =
  '[data-workbench-link-hover-card]'

type WorkbenchLinkChipProps = {
  workbenchId: string
  workbenchName: string
  workbenchJobId?: string
  stopPropagation?: boolean
  onNavigate?: () => void
} & Partial<
  Pick<
    ComponentProps<typeof Chip>,
    'fillLevel' | 'truncateWidth' | 'css' | 'size' | 'severity'
  >
>

const HOVER_CLOSE_DELAY_MS = 200

export function WorkbenchLinkChip({
  workbenchId,
  workbenchName,
  workbenchJobId,
  stopPropagation = false,
  onNavigate,
  fillLevel = 1,
  truncateWidth = 80,
  size = 'small',
  severity = 'neutral',
  css,
}: WorkbenchLinkChipProps) {
  const theme = useTheme()
  const navigate = useNavigate()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const closeTimerRef = useRef<number | undefined>(undefined)
  const [open, setOpen] = useState(false)

  const { floating, triggerRef: mergedTriggerRef } = useFloatingDropdown({
    triggerRef,
    placement: 'right',
    width: WORKBENCH_LINK_HOVER_CARD_WIDTH,
  })

  const { data } = useWorkbenchLinkCardQuery({
    variables: { id: workbenchId },
    skip: !open,
    fetchPolicy: 'cache-first',
  })

  const { data: pendingData } = useWorkbenchLinkCardPendingAgentRunsQuery({
    skip: !open,
    fetchPolicy: 'cache-first',
  })

  const pendingAgentRuns = useMemo(
    () =>
      pendingData?.agentRuns?.edges?.filter(
        (edge) => edge?.node?.workbenchJob?.workbench?.id === workbenchId
      ).length ?? 0,
    [pendingData, workbenchId]
  )

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = undefined
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(
      () => setOpen(false),
      HOVER_CLOSE_DELAY_MS
    )
  }

  const handleOpen = () => {
    clearCloseTimer()
    setOpen(true)
  }

  const handleChipClick = (event: React.MouseEvent) => {
    if (stopPropagation) event.stopPropagation()
    if (!workbenchJobId) return

    navigate(getWorkbenchJobAbsPath({ workbenchId, jobId: workbenchJobId }))
    onNavigate?.()
  }

  return (
    <>
      <span
        ref={mergedTriggerRef}
        onMouseEnter={handleOpen}
        onMouseLeave={scheduleClose}
        css={{ display: 'inline-flex', flexShrink: 0 }}
      >
        <Chip
          size={size}
          severity={severity}
          fillLevel={fillLevel}
          clickable
          onClick={handleChipClick}
          icon={<WorkbenchIcon size={12} />}
          truncateWidth={truncateWidth}
          css={css}
        >
          {workbenchName}
        </Chip>
      </span>
      {open && (
        <FloatingPortal id={theme.portals.default.id}>
          <HoverCardFloatingSC
            data-workbench-link-hover-card
            ref={floating.floating}
            style={{
              position: floating.strategy,
              left: floating.x ?? 0,
              top: floating.y ?? 0,
            }}
            onMouseEnter={handleOpen}
            onMouseLeave={scheduleClose}
          >
            <WorkbenchLinkHoverCard
              workbenchName={workbenchName}
              workbenchId={workbenchId}
              workbench={data?.workbench}
              pendingAgentRuns={pendingAgentRuns}
              onNavigate={() => {
                setOpen(false)
                onNavigate?.()
              }}
            />
          </HoverCardFloatingSC>
        </FloatingPortal>
      )}
    </>
  )
}

const HoverCardFloatingSC = styled.div(({ theme }) => ({
  pointerEvents: 'auto',
  zIndex: theme.zIndexes.tooltip,
  paddingTop: theme.spacing.xxsmall,
  marginTop: -theme.spacing.xxsmall,
}))
