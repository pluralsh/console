import { createContext, useCallback, useState } from 'react'
import { GearTrainIcon, IconFrame, Modal } from '@pluralsh/design-system'

import UpgradePoliciesList from './UpgradePoliciesList'

export const PolicyContext = createContext({})

export function UpgradePolicies() {
  const [modal, setModal] = useState<any>(null)
  const close = useCallback(() => setModal(null), [setModal])

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <PolicyContext.Provider value={{ modal, setModal, close }}>
      <>
        <IconFrame
          icon={<GearTrainIcon />}
          textValue="Upgrade settings"
          tooltip
          type="secondary"
          size="medium"
          height={40}
          width={40}
          clickable
          onClick={() =>
            setModal({
              header: 'Upgrade Policies',
              content: <UpgradePoliciesList />,
            })
          }
        />
        <Modal
          header={modal?.header}
          onClose={() => setModal(null)}
          open={modal}
          size="large"
        >
          {modal?.content}
        </Modal>
      </>
    </PolicyContext.Provider>
  )
}
