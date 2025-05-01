import {
  ArrowRightIcon,
  Button,
  ChatOutlineIcon,
  Flex,
  FormField,
  GitForkIcon,
  Input,
  ListBoxItem,
  Modal,
  PencilIcon,
  Spinner,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import {
  ChatThreadTinyFragment,
  useDeleteChatThreadMutation,
  useUpdateChatThreadMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { useChatbot, useChatbotContext } from './AIContext'
import { GqlError } from 'components/utils/Alert'

enum MenuItemKey {
  OpenChat = 'open-chat',
  Rename = 'rename',
  Fork = 'fork',
  Delete = 'delete',
}

export function AITableActions({
  thread,
}: {
  thread: Nullable<ChatThreadTinyFragment>
}) {
  const [menuKey, setMenuKey] = useState<Nullable<string>>('')
  const { goToThread, forkThread, loading: forkLoading } = useChatbot()

  if (!thread) return null

  const onSelectionChange = (newKey: string) => {
    if (newKey === MenuItemKey.OpenChat) goToThread(thread.id)
    else if (newKey === MenuItemKey.Fork)
      forkThread({
        id: thread.id,
        onCompleted: (data) =>
          data.cloneThread && goToThread(data.cloneThread.id),
      })
    else setMenuKey(newKey)
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <MoreMenu
        onSelectionChange={onSelectionChange}
        width={256}
        {...(forkLoading && { triggerButton: <Spinner /> })}
      >
        <ListBoxItem
          key={MenuItemKey.OpenChat}
          leftContent={<ChatOutlineIcon />}
          rightContent={<ArrowRightIcon color="icon-default" />}
          label="Open Chat"
        />
        <ListBoxItem
          key={MenuItemKey.Rename}
          leftContent={<PencilIcon />}
          label="Rename thread"
        />
        <ListBoxItem
          key={MenuItemKey.Fork}
          leftContent={<GitForkIcon />}
          rightContent={<ArrowRightIcon color="icon-default" />}
          label="Fork thread"
        />
        <ListBoxItem
          key={MenuItemKey.Delete}
          destructive
          leftContent={<TrashCanIcon color="icon-danger" />}
          label="Delete thread"
        />
      </MoreMenu>
      {/* Modals */}
      <Modal
        open={menuKey === MenuItemKey.Rename}
        onClose={() => setMenuKey('')}
      >
        <RenameAiThread
          thread={thread}
          onClose={() => setMenuKey('')}
        />
      </Modal>
      <DeleteAiThreadModal
        thread={thread}
        open={menuKey === MenuItemKey.Delete}
        onClose={() => setMenuKey('')}
      />
    </div>
  )
}

export function RenameAiThread({
  thread,
  onClose,
}: {
  thread: ChatThreadTinyFragment
  onClose: () => void
}) {
  const [name, setName] = useState(thread.summary)
  const [mutation, { loading, error }] = useUpdateChatThreadMutation({
    variables: { id: thread.id, attributes: { summary: name } },
    onCompleted: onClose,
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        mutation()
      }}
    >
      <Flex
        flexDirection="column"
        gap="medium"
      >
        {error && <GqlError error={error} />}
        <FormField label="Thread name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <Flex
          justifyContent="flex-end"
          gap="small"
        >
          <Button
            secondary
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            primary
            type="submit"
            loading={loading}
            disabled={name === thread.summary}
          >
            Update
          </Button>
        </Flex>
      </Flex>
    </form>
  )
}

export function DeleteAiThreadModal({
  thread,
  open,
  onClose,
}: {
  thread: ChatThreadTinyFragment
  open: boolean
  onClose: Nullable<() => void>
}) {
  const { setCurrentThreadId } = useChatbotContext()
  const [mutation, { loading, error }] = useDeleteChatThreadMutation({
    variables: { id: thread.id },
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreads', 'AiPins'],
    onCompleted: () => {
      setCurrentThreadId(null)
      onClose?.()
    },
  })

  return (
    <Confirm
      close={() => onClose?.()}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="Delete thread"
      text={<>Are you sure you want to delete this thread?</>}
    />
  )
}
