import {
  ArrowTopRightIcon,
  Button,
  Flex,
  Modal,
  Toast,
} from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { createContext, ReactNode, useCallback, useState } from 'react'
import { FLOW_DOCS_URL } from './Flows'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts'
import { Link } from 'react-router-dom'

const FLOWS_STORAGE_KEY = 'flows-enabled'

export const FlowsContext = createContext<{
  flowsEnabled: boolean
  setFlowsEnabled: (flowsEnabled: boolean) => void
}>({
  flowsEnabled: false,
  setFlowsEnabled: () => {},
})
export const FlowsEnabledProvider = ({ children }: { children: ReactNode }) => {
  const [flowsEnabled, setFlowsEnabledState] = usePersistedState(
    FLOWS_STORAGE_KEY,
    false
  )
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const setFlowsEnabled = useCallback(
    (value: boolean) => {
      if (flowsEnabled && value) return
      if (value) setShowModal(true)
      else setFlowsEnabledState(false)
    },
    [flowsEnabled, setFlowsEnabledState]
  )

  return (
    <FlowsContext value={{ flowsEnabled, setFlowsEnabled }}>
      {children}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        header="Enable “Flows” Feature"
        actions={
          <Flex
            justify="space-between"
            width="100%"
          >
            <Button
              as="a"
              href={FLOW_DOCS_URL}
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
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setFlowsEnabledState(true)
                  setShowToast(true)
                  setShowModal(false)
                }}
              >
                Enable Flows
              </Button>
            </Flex>
          </Flex>
        }
      >
        <span>
          <strong>Flows</strong> are an experimental feature that bundle
          together services, pipelines, PR automations, and more into
          permissioned groupings that help teams coordinate in a single
          workspace.
          <br />
          <br />
          Flows also enable you to connect Plural AI functionality to MCP
          servers, configurable in the AI tab after enabled.
        </span>
      </Modal>
      <Toast
        show={showToast}
        closeTimeout={3000}
        position="bottom"
        margin="medium"
        severity="success"
        onClose={() => setShowToast(false)}
      >
        <Flex gap="small">
          {'"Flows" feature enabled'}
          <InlineLink
            as={Link}
            to={FLOWS_ABS_PATH}
          >
            Go to Flows
          </InlineLink>
        </Flex>
      </Toast>
    </FlowsContext>
  )
}
