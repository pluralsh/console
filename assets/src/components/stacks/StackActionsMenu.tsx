import {
  Button,
  DropdownArrowIcon,
  ListBoxItem,
  Spinner,
  Toast,
  Tooltip,
} from '@pluralsh/design-system'
import { ReactNode, useState } from 'react'
import {
  StackTinyFragment,
  useTriggerStackRunMutation,
} from '../../generated/graphql.ts'
import { MoreMenu } from '../utils/MoreMenu'
import StackCustomRunModal from './customrun/StackCustomRunModal.tsx'

enum MenuItemKey {
  None = '',
  Resync = 'resync',
  CustomRun = 'customrun',
  RunNow = 'runnow',
}

export default function StackActionsMenu({
  stack,
}: {
  stack: StackTinyFragment | undefined
}): ReactNode {
  const [isOpen, setIsOpen] = useState(false)
  const [menuKey, setMenuKey] = useState<MenuItemKey>(MenuItemKey.None)
  const [mutation, { loading, error }] = useTriggerStackRunMutation()

  return (
    <>
      {error && (
        <Toast
          severity="danger"
          margin="xlarge"
          marginVertical="xxxlarge"
        >
          Error: {error.message}
        </Toast>
      )}
      <MoreMenu
        triggerButton={
          <Button endIcon={loading ? <Spinner /> : <DropdownArrowIcon />}>
            Actions
          </Button>
        }
        isOpen={isOpen}
        onOpenChange={(open) => setIsOpen(open)}
        onSelectionChange={(newKey: MenuItemKey) => setMenuKey(newKey)}
      >
        <Tooltip label="Start a new stack run from the newest SHA in the history">
          <ListBoxItem
            key={MenuItemKey.RunNow}
            label="Run now"
            onClick={() => {
              mutation({
                variables: { id: stack?.id ?? '' },
              })
              setIsOpen(false)
            }}
          />
        </Tooltip>
        <ListBoxItem
          key={MenuItemKey.CustomRun}
          label="Custom run"
        />
      </MoreMenu>
      <StackCustomRunModal
        open={menuKey === MenuItemKey.CustomRun}
        onClose={() => setMenuKey(MenuItemKey.None)}
        stackId={stack?.id ?? ''}
      />
    </>
  )
}
