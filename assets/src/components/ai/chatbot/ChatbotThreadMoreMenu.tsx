import {
  ArrowRightIcon,
  BrainIcon,
  DiffColumnIcon,
  EditIcon,
  GitForkIcon,
  IconFrame,
  ListBoxItem,
  Modal,
  MoreIcon,
  PushPinFilledIcon,
  PushPinOutlineIcon,
  Spinner,
  Toast,
  TrashCanIcon,
} from '@pluralsh/design-system'
import {
  CommandPaletteContext,
  CommandPaletteTab,
} from 'components/commandpalette/CommandPaletteContext.tsx'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useUpdateChatThreadMutation } from 'generated/graphql'
import { use, useCallback, useRef, useState } from 'react'
import { useChatbot } from '../AIContext'
import { useAiPin } from '../AIPinButton'
import { DeleteAiThreadModal, RenameAiThread } from '../AITableActions'

enum MenuItemKey {
  KnowledgeGraph = 'knowledgeGraph',
  Pin = 'pin',
  Rename = 'rename',
  Fork = 'fork',
  Delete = 'delete',
  History = 'history',
}

export function ChatbotThreadMoreMenu() {
  const {
    forkThread,
    mutationLoading: forkLoading,
    currentThread,
  } = useChatbot()
  const { setCmdkOpen, setInitialTab } = use(CommandPaletteContext)
  const [menuKey, setMenuKey] = useState<MenuItemKey | ''>('')
  const [isOpen, setIsOpen] = useState(false)

  // need a ref instead of state because state doesn't update before onOpenChange fires
  const blockClose = useRef(false)

  const { isPinned, pinCreating, pinDeleting, handlePin } = useAiPin({
    thread: currentThread,
  })
  const pinLoading = pinCreating || pinDeleting

  const closeMenu = () => {
    setIsOpen(false)
    blockClose.current = false
    setMenuKey('')
  }

  const handleSelectionChange = (selectedKey: MenuItemKey) => {
    blockClose.current = true
    switch (selectedKey) {
      case MenuItemKey.KnowledgeGraph:
        toggleKnowledgeGraph()
        break
      case MenuItemKey.Pin:
        handlePin()
        break
      case MenuItemKey.Fork:
        forkThread({
          id: currentThread?.id ?? '',
          onCompleted: () => closeMenu(),
        })
        break
      case MenuItemKey.History:
        closeMenu()
        setCmdkOpen(true)
        setInitialTab(CommandPaletteTab.History)
        break
      default:
        blockClose.current = false
        setMenuKey(selectedKey)
        break
    }
  }

  const [
    updateThread,
    { loading: knowledgeGraphLoading, error: knowledgeGraphError },
  ] = useUpdateChatThreadMutation()

  const toggleKnowledgeGraph = useCallback(() => {
    updateThread({
      variables: {
        id: currentThread?.id ?? '',
        attributes: {
          summary: currentThread?.summary ?? '',
          settings: { memory: !currentThread?.settings?.memory },
        },
      },
    })
  }, [currentThread, updateThread])

  if (!currentThread) return null

  return (
    <>
      <MoreMenu
        isOpen={isOpen}
        // a bit hacky but basically just blocks closing menu if mutations are running, so we can see their loading states
        onOpenChange={(newOpen) => {
          if (!newOpen && blockClose.current)
            blockClose.current = false // unblock it so user can still manually close menu
          else setIsOpen(newOpen)
        }}
        onSelectionChange={handleSelectionChange}
        triggerButton={
          <IconFrame
            clickable
            type="tertiary"
            icon={<MoreIcon css={{ width: 16 }} />}
          />
        }
        width={256}
      >
        <ListBoxItem
          key={MenuItemKey.KnowledgeGraph}
          leftContent={
            knowledgeGraphLoading ? (
              <Spinner />
            ) : (
              <BrainIcon
                color={
                  currentThread?.settings?.memory ? 'icon-info' : 'icon-default'
                }
              />
            )
          }
          label={
            currentThread?.settings?.memory
              ? 'Disable knowledge graph'
              : 'Enable knowledge graph'
          }
          disabled={knowledgeGraphLoading}
        />
        <ListBoxItem
          key={MenuItemKey.Pin}
          leftContent={
            pinLoading ? (
              <Spinner />
            ) : isPinned ? (
              <PushPinFilledIcon
                color="icon-info"
                css={{ width: 16 }}
              />
            ) : (
              <PushPinOutlineIcon />
            )
          }
          label={isPinned ? 'Unpin thread' : 'Pin thread'}
        />
        <ListBoxItem
          key={MenuItemKey.Rename}
          leftContent={<EditIcon />}
          label="Rename thread"
        />
        <ListBoxItem
          key={MenuItemKey.Fork}
          leftContent={forkLoading ? <Spinner /> : <GitForkIcon />}
          rightContent={<ArrowRightIcon color="icon-default" />}
          label="Fork thread"
        />
        <ListBoxItem
          key={MenuItemKey.History}
          leftContent={<DiffColumnIcon />}
          rightContent={<ArrowRightIcon color="icon-default" />}
          label="View history"
        />
        <ListBoxItem
          destructive
          key={MenuItemKey.Delete}
          leftContent={<TrashCanIcon color="icon-danger" />}
          label="Delete thread"
        />
      </MoreMenu>
      <Modal
        open={menuKey === MenuItemKey.Rename}
        onClose={closeMenu}
      >
        <RenameAiThread
          thread={currentThread}
          onClose={closeMenu}
        />
      </Modal>
      <DeleteAiThreadModal
        thread={currentThread}
        open={menuKey === MenuItemKey.Delete}
        onClose={closeMenu}
      />
      <Toast
        show={!!knowledgeGraphError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        Error updating thread settings.
      </Toast>
    </>
  )
}
