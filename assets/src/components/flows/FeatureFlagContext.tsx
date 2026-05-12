// **
// for loose feature flags that only need to be managed on the front end
// **

import {
  ArrowTopRightIcon,
  Button,
  Flex,
  Modal,
  Toast,
} from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { createContext, ReactNode, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { EDGE_ABS_PATH } from 'routes/edgeRoutes'

const FEATURE_FLAG_STORAGE_KEY = 'feature-flags'
const defaultDocsUrl = 'https://docs.plural.sh/'

export type FeatureFlags = {
  Edge: boolean
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  Edge: false,
}

export const FeatureFlagContext = createContext<{
  featureFlags: FeatureFlags
  setFeatureFlag: (key: keyof FeatureFlags, value: boolean) => void
}>({
  featureFlags: DEFAULT_FEATURE_FLAGS,
  setFeatureFlag: () => {},
})

export const FeatureFlagProvider = ({ children }: { children: ReactNode }) => {
  const [featureFlags, setFeatureFlagsState] = usePersistedState(
    FEATURE_FLAG_STORAGE_KEY,
    DEFAULT_FEATURE_FLAGS
  )

  const [curType, setCurType] = useState<keyof FeatureFlags | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const setFeatureFlag = useCallback(
    (key: keyof FeatureFlags, value: boolean) => {
      if (featureFlags[key] && value) return
      if (value) {
        // show confirmation modal before setting the flag to true
        setCurType(key)
        setShowModal(true)
      } else setFeatureFlagsState({ ...featureFlags, [key]: false })
    },
    [featureFlags, setFeatureFlagsState]
  )

  return (
    <FeatureFlagContext value={{ featureFlags, setFeatureFlag }}>
      {children}
      <FeatureFlagConfirmationModal
        type={curType}
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => {
          if (curType) {
            setFeatureFlagsState({ ...featureFlags, [curType]: true })
            setShowToast(true)
            setShowModal(false)
          }
        }}
      >
        {curType === 'Edge' && <EdgeBodyContent />}
      </FeatureFlagConfirmationModal>
      <Toast
        show={showToast}
        closeTimeout={3000}
        position="bottom"
        margin="medium"
        severity="success"
        onClose={() => setShowToast(false)}
      >
        <Flex gap="small">
          {`"${curType}" feature enabled`}
          {curType === 'Edge' && (
            <InlineLink
              as={Link}
              to={EDGE_ABS_PATH}
            >
              Go to Edge
            </InlineLink>
          )}
        </Flex>
      </Toast>
    </FeatureFlagContext>
  )
}

function FeatureFlagConfirmationModal({
  type,
  open,
  onClose,
  onConfirm,
  children,
}: {
  type: keyof FeatureFlags | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  children: ReactNode
}) {
  const docsUrl = defaultDocsUrl
  return (
    <Modal
      open={open}
      onClose={onClose}
      header={`Enable "${type}" Feature`}
      actions={
        <Flex
          justify="space-between"
          width="100%"
        >
          <Button
            as="a"
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            secondary
            endIcon={<ArrowTopRightIcon />}
          >
            Read docs
          </Button>
          <Flex gap="small">
            <Button
              secondary
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button onClick={onConfirm}>{`Enable ${type}`}</Button>
          </Flex>
        </Flex>
      }
    >
      {children}
    </Modal>
  )
}

function EdgeBodyContent() {
  return (
    <span>
      <strong>Edge</strong> is an experimental feature that allows you to deploy
      and manage your own edge compute resources on Plural.
    </span>
  )
}
