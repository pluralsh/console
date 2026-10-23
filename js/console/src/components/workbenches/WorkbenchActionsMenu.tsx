import {
  BotIcon,
  EventScheduleIcon,
  GearTrainIcon,
  ICON_FRAME_ICON_SIZE,
  ListBoxItem,
  WebhooksIcon,
} from '@pluralsh/design-system'
import { FlowFavoriteStar } from 'components/flows/FlowFavoriteButton'
import { MoreMenu } from 'components/utils/MoreMenu'
import { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  WORKBENCHES_EDIT_REL_PATH,
  getWorkbenchAbsPath,
  getWorkbenchChatbotsAbsPath,
  getWorkbenchCronSchedulesAbsPath,
  getWorkbenchWebhookTriggersAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'

function stopBubble(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

function stopLink(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

export function WorkbenchActionsMenu({
  workbenchId,
  favorited,
  onToggleFavorite,
}: {
  workbenchId: string
  favorited: boolean
  onToggleFavorite: () => void
}) {
  const navigate = useNavigate()
  const favoriteLabel = favorited
    ? 'Unfavorite this workbench'
    : 'Favorite this workbench'
  const onSelect: Record<string, () => void> = {
    edit: () =>
      navigate(
        `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_EDIT_REL_PATH}`
      ),
    cron: () => navigate(getWorkbenchCronSchedulesAbsPath(workbenchId)),
    webhooks: () => navigate(getWorkbenchWebhookTriggersAbsPath(workbenchId)),
    chatbots: () => navigate(getWorkbenchChatbotsAbsPath(workbenchId)),
    favorite: onToggleFavorite,
  }

  return (
    <ActionsSC
      onClick={stopLink}
      onPointerDown={stopBubble}
      onMouseDown={stopBubble}
    >
      <MoreMenu onSelectionChange={(key: string) => onSelect[key]?.()}>
        <ListBoxItem
          key="edit"
          label="Edit workbench"
          leftContent={<GearTrainIcon size={ICON_FRAME_ICON_SIZE.small} />}
          textValue="Edit workbench"
        />
        <ListBoxItem
          key="cron"
          label="Cron schedules"
          leftContent={<EventScheduleIcon size={ICON_FRAME_ICON_SIZE.small} />}
          textValue="Cron schedules"
        />
        <ListBoxItem
          key="webhooks"
          label="Webhook triggers"
          leftContent={<WebhooksIcon size={ICON_FRAME_ICON_SIZE.small} />}
          textValue="Webhook triggers"
        />
        <ListBoxItem
          key="chatbots"
          label="Chatbots"
          leftContent={<BotIcon size={ICON_FRAME_ICON_SIZE.small} />}
          textValue="Chatbots"
        />
        <ListBoxItem
          key="favorite"
          label={favoriteLabel}
          leftContent={<FlowFavoriteStar size={ICON_FRAME_ICON_SIZE.small} />}
          textValue={favoriteLabel}
        />
      </MoreMenu>
    </ActionsSC>
  )
}

const ActionsSC = styled.div({
  position: 'relative',
  zIndex: 1,
  pointerEvents: 'auto',
})
