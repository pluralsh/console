import {
  Flex,
  IconFrame,
  PencilIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ChatProviderConnectionFragment } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getChatbotsSettingsEditAbsPath } from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'
import { chatProviderConnectionIcon } from 'components/workbenches/workbench/chatbots/utils'
import { DeleteChatbotConnectionModal } from './DeleteChatbotConnectionModal'

const columnHelper = createColumnHelper<ChatProviderConnectionFragment>()

export function getChatbotColumns({ refetch }: { refetch?: () => void }) {
  return [
    columnHelper.accessor((chatbot) => chatbot, {
      id: 'provider',
      meta: { gridTemplate: '40px' },
      cell: ({ getValue }) => {
        const chatbot = getValue()

        return (
          <IconFrame
            size="small"
            type="floating"
            icon={chatProviderConnectionIcon(chatbot.type, false)}
          />
        )
      },
    }),
    columnHelper.accessor((chatbot) => chatbot.name, {
      id: 'name',
      meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.display({
      id: 'actions',
      meta: { gridTemplate: 'fit-content(72px)' },
      cell: function Cell({ row }) {
        return (
          <ChatbotActions
            chatbot={row.original}
            refetch={refetch}
          />
        )
      },
    }),
  ]
}

function ChatbotActions({
  chatbot,
  refetch,
}: {
  chatbot: ChatProviderConnectionFragment
  refetch?: () => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  return (
    <Flex
      align="center"
      justify="flex-end"
      gap="xxsmall"
    >
      <IconFrame
        clickable
        tooltip="Edit chatbot"
        icon={<PencilIcon />}
        onClick={() =>
          navigate(
            getChatbotsSettingsEditAbsPath({
              chatbotId: chatbot.id,
            })
          )
        }
      />
      <IconFrame
        clickable
        tooltip="Delete chatbot"
        icon={<TrashCanIcon color={theme.colors['icon-danger']} />}
        onClick={() => setDeleting(true)}
      />
      <DeleteChatbotConnectionModal
        chatbot={chatbot}
        open={deleting}
        refetch={refetch}
        onClose={() => setDeleting(false)}
      />
    </Flex>
  )
}
