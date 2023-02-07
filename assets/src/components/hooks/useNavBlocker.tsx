import { Button, Modal } from '@pluralsh/design-system'
import { ComponentProps, useEffect, useState } from 'react'
import { unstable_BlockerFunction as BlockerFunction, unstable_useBlocker as useBlocker, useNavigate } from 'react-router-dom'
import { P } from 'honorable'

type NavProps = Parameters<BlockerFunction>[0]
function NavBlockerModal({
  open,
  onClose,
  onConfirm,
  ...props
}: { onConfirm: () => void } & ComponentProps<typeof Modal>) {
  return (
    <Modal
      header="Unsaved changes"
      open={open}
      onClose={onClose}
      actions={(
        <>
          <Button
            secondary
            onClick={onClose}
          >
            Stay here
          </Button>
          <Button
            destructive
            onClick={() => {
              onConfirm()
            }}
            marginLeft="medium"
          >
            Leave without saving
          </Button>
        </>
      )}
      {...props}
    >
      <P>Are you sure you want to leave without saving?</P>
    </Modal>
  )
}
export const useNavBlocker = (shouldBlock: boolean) => {
  const [navProps, setNavProps] = useState<NavProps | null>()
  const [go, setGo] = useState(false)
  const navigate = useNavigate()

  const nextLoc = navProps?.nextLocation

  useEffect(() => {
    if (go && nextLoc) {
      navigate(nextLoc.pathname, { state: nextLoc.state })
      setNavProps(null)
    }
  }, [go, navigate, nextLoc])

  useBlocker(props => {
    if (go || !shouldBlock) {
      setGo(false)

      return false
    }
    setNavProps(props)

    return true
  })

  return (
    <NavBlockerModal
      open={!!navProps}
      onClose={() => {
        setNavProps(null)
        setGo(false)
      }}
      onConfirm={() => setGo(true)}
    />
  )
}
