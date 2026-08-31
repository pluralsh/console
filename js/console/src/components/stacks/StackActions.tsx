import {
  ArrowTopRightIcon,
  Button,
  CaretDownIcon,
  Flex,
  IconFrame,
  ListBoxItem,
  Spinner,
  Toast,
} from '@pluralsh/design-system'
import { ReactNode, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import {
  StackTinyFragment,
  useKickStackMutation,
  useTriggerStackRunMutation,
} from '../../generated/graphql'
import KickButton from '../utils/KickButton'
import { MoreMenu } from '../utils/MoreMenu'
import StackCustomRun from './customrun/StackCustomRun'
import StackCustomRunModal from './customrun/StackCustomRunModal'
import RestoreStackButton from './RestoreStackButton'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Link } from 'react-router-dom'

enum MenuItemKey {
  None = '',
  Resync = 'resync',
  CustomRun = 'customrun',
  RunNow = 'runnow',
}

interface StackActionsProps {
  stack: StackTinyFragment | undefined
  deleting: boolean
}

export default function StackActions({
  stack,
  deleting,
}: StackActionsProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false)
  const [menuKey, setMenuKey] = useState<MenuItemKey>(MenuItemKey.Resync)
  const [showRestoreToast, setShowRestoreToast] = useState(false)
  const [mutation, { loading, error }] = useTriggerStackRunMutation({
    refetchQueries: ['Stacks'],
    awaitRefetchQueries: true,
  })
  const theme = useTheme()

  // need a ref instead of state because state doesn't update before onOpenChange fires
  const blockClose = useRef(false)

  const closeMenu = () => {
    setIsOpen(false)
    blockClose.current = false
    setMenuKey(MenuItemKey.None)
  }

  const onSelectionChange = async (selectedKey: MenuItemKey) => {
    blockClose.current = true
    switch (selectedKey) {
      case MenuItemKey.RunNow:
        await mutation({
          variables: { id: stack?.id ?? '' },
        })
        closeMenu()
        break
      default:
        blockClose.current = false
        setMenuKey(selectedKey)
        break
    }
  }

  return (
    <>
      {deleting ? (
        <>
          <RestoreStackButton
            id={stack?.id ?? ''}
            setShowToast={setShowRestoreToast}
          />
          <StackCustomRun stackId={stack?.id ?? ''} />
        </>
      ) : (
        <Flex
          align="center"
          borderRadius={theme.borderRadiuses.medium}
        >
          <KickButton
            key={stack?.id ?? 'id'}
            floating
            css={{
              borderRight: 'none',
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              transition: 'none',
            }}
            pulledAt={stack?.repository?.pulledAt}
            kickMutationHook={useKickStackMutation}
            mutationOptions={{
              refetchQueries: ['Stacks'],
              awaitRefetchQueries: true,
            }}
            message="Resync"
            tooltipMessage="Use this to sync this stack now instead of at the next poll interval"
            variables={{ id: stack?.id }}
            width="max-content"
          />
          <MoreMenu
            width={350}
            triggerButton={
              <IconFrame
                css={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                type="floating"
                size="large"
                icon={<CaretDownIcon />}
                clickable
              />
            }
            isOpen={isOpen}
            onOpenChange={(newOpen) => {
              if (!newOpen && blockClose.current)
                blockClose.current = false // unblock it so user can still manually close menu
              else setIsOpen(newOpen)
            }}
            onSelectionChange={onSelectionChange}
          >
            <ListBoxItem
              key={MenuItemKey.CustomRun}
              label="Create a custom stack run"
              description="Start a stack run with custom parameters"
            />
            <ListBoxItem
              key={MenuItemKey.RunNow}
              label="Trigger a stack run"
              description="Start a new stack run from the newest SHA in the history"
              rightContent={loading ? <Spinner /> : null}
            />
          </MoreMenu>
        </Flex>
      )}
      {stack?.parent?.id && (
        <Button
          secondary
          as={Link}
          to={getServiceDetailsPath({ serviceId: stack.parent.id })}
          endIcon={<ArrowTopRightIcon />}
        >
          Parent
        </Button>
      )}
      <StackCustomRunModal
        open={menuKey === MenuItemKey.CustomRun}
        onClose={closeMenu}
        stackId={stack?.id ?? ''}
      />
      <Toast
        show={!!error}
        severity="danger"
        margin="xlarge"
        marginVertical="xxxlarge"
      >
        Error: {error?.message}
      </Toast>
      <Toast
        show={showRestoreToast}
        position="bottom"
        onClose={() => setShowRestoreToast(false)}
        closeTimeout={5000}
        margin="large"
        severity="success"
      >
        Stack &quot;{stack?.name}&quot; restored.
      </Toast>
    </>
  )
}
