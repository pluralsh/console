import {
  ArrowRightIcon,
  DiffColumnIcon,
  EditIcon,
  GitForkIcon,
  IconFrame,
  ListBoxItem,
  Modal,
  MoreIcon,
  Spinner,
  TrashCanIcon,
} from '@pluralsh/design-system'
import {
  CommandPaletteContext,
  CommandPaletteTab,
} from 'components/commandpalette/CommandPaletteContext.tsx'
import { MoreMenu } from 'components/utils/MoreMenu'
import { use, useRef, useState } from 'react'
import { useChatbot } from '../AIContext'

import { DeleteAiThreadModal, RenameAiThread } from '../AITableActions'

enum MenuItemKey {
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
  const { setCmdkOpen } = use(CommandPaletteContext)
  const [menuKey, setMenuKey] = useState<MenuItemKey | ''>('')
  const [isOpen, setIsOpen] = useState(false)

  // need a ref instead of state because state doesn't update before onOpenChange fires
  const blockClose = useRef(false)

  const closeMenu = () => {
    setIsOpen(false)
    blockClose.current = false
    setMenuKey('')
  }

  const handleSelectionChange = (selectedKey: MenuItemKey) => {
    blockClose.current = true
    switch (selectedKey) {
      case MenuItemKey.Fork:
        forkThread({
          id: currentThread?.id ?? '',
          onCompleted: () => closeMenu(),
        })
        break
      case MenuItemKey.History:
        closeMenu()
        setCmdkOpen(true, CommandPaletteTab.Threads)
        break
      default:
        blockClose.current = false
        setMenuKey(selectedKey)
        break
    }
  }

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
    </>
  )
}
