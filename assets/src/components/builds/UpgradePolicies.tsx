import { createContext, useCallback, useMemo, useState } from 'react'
import { GearTrainIcon, IconFrame, Modal } from '@pluralsh/design-system'

import UpgradePoliciesList from './UpgradePoliciesList'

export const PolicyContext = createContext({})

export function UpgradePolicies() {
  const [modal, setModal] = useState<any>(null)
  const close = useCallback(() => setModal(null), [setModal])
  const contextVal = useMemo(() => ({ modal, setModal, close }), [close, modal])

  return (
    <PolicyContext.Provider value={contextVal}>
      <>
        <IconFrame
          icon={<GearTrainIcon />}
          textValue="Upgrade settings"
          tooltip
          type="secondary"
          size="medium"
          clickable
          onClick={() =>
            setModal({
              header: 'Upgrade Policies',
              content: <UpgradePoliciesList />,
            })
          }
          css={{ width: 40, height: 40 }}
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
