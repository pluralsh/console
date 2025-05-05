import {
  ArrowRightIcon,
  EditIcon,
  GitForkIcon,
  IconFrame,
  ListBoxItem,
  Modal,
  MoreIcon,
  PushPinFilledIcon,
  PushPinOutlineIcon,
  Spinner,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useState } from 'react'
import { useChatbot } from '../AIContext'
import { useAiPin } from '../AIPinButton'
import { DeleteAiThreadModal, RenameAiThread } from '../AITableActions'

enum MenuItemKey {
  Pin = 'pin',
  Rename = 'rename',
  Fork = 'fork',
  Delete = 'delete',
}

export function ChatbotThreadMoreMenu({ fullscreen }: { fullscreen: boolean }) {
  const { forkThread, mutationLoading, currentThread } = useChatbot()
  const [menuKey, setMenuKey] = useState<MenuItemKey | ''>('')
  const [isOpen, setIsOpen] = useState(false)
  const [pinHovered, setPinHovered] = useState(false)
  const [forkHovered, setForkHovered] = useState(false)

  const { isPinned, pinCreating, pinDeleting, handlePin } = useAiPin({
    thread: currentThread,
  })
  const pinLoading = pinCreating || pinDeleting

  const closeMenu = () => {
    setIsOpen(false)
    setMenuKey('')
  }

  const handleSelectionChange = (selectedKey: MenuItemKey) => {
    switch (selectedKey) {
      case MenuItemKey.Pin:
        handlePin()
        break
      case MenuItemKey.Fork:
        forkThread({
          id: currentThread?.id ?? '',
          onCompleted: () => closeMenu(),
        })
        break
      default:
        setMenuKey(selectedKey)
        break
    }
  }

  if (!currentThread) return null

  return (
    <>
      <MoreMenu
        isOpen={isOpen}
        // a bit hacky but basically just blocks closing menu if pin or fork options are hovered, so we can see their loading states
        onOpenChange={(newOpen) =>
          (newOpen || !(pinHovered || forkHovered)) && setIsOpen(newOpen)
        }
        onSelectionChange={handleSelectionChange}
        size={fullscreen ? 'large' : 'medium'}
        triggerButton={
          <IconFrame
            clickable
            type="secondary"
            size={fullscreen ? 'large' : 'medium'}
            icon={<MoreIcon css={{ width: 16 }} />}
          />
        }
        width={256}
      >
        <ListBoxItem
          onMouseEnter={() => setPinHovered(true)}
          onMouseLeave={() => setPinHovered(false)}
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
          onMouseEnter={() => setForkHovered(true)}
          onMouseLeave={() => setForkHovered(false)}
          key={MenuItemKey.Fork}
          leftContent={mutationLoading ? <Spinner /> : <GitForkIcon />}
          rightContent={<ArrowRightIcon color="icon-default" />}
          label="Fork thread"
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
