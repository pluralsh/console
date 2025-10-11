import {
  ArrowTopRightIcon,
  Button,
  EyeIcon,
  Flex,
  FormField,
  IconFrame,
  Input,
  ListIcon,
  Modal,
  Switch,
} from '@pluralsh/design-system'
import { McpServerFragment } from 'generated/graphql'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'
import { useTheme } from 'styled-components'
import { McpAuditModal } from './McpAuditTable'

export function ViewMcpServerDetails({
  server,
  onDisconnect,
  loading,
}: {
  server: McpServerFragment
  onDisconnect?: () => void
  loading?: boolean
}) {
  const { colors } = useTheme()
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  return (
    <>
      <IconFrame
        clickable
        tooltip="View"
        icon={<EyeIcon />}
        onClick={() => setShowDetailsModal(true)}
      />
      <Modal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        size="large"
        header={
          <Flex
            justify="space-between"
            align="center"
          >
            <span>View MCP server</span>
            <Flex gap="small">
              <Button
                secondary
                as={Link}
                to={AI_MCP_SERVERS_ABS_PATH}
                onClick={() => setShowDetailsModal(false)}
                endIcon={<ArrowTopRightIcon />}
                style={{ textTransform: 'none' }}
              >
                Edit MCP servers
              </Button>
              <Button
                secondary
                startIcon={<ListIcon />}
                onClick={() => setShowAuditModal(true)}
              >
                Audit trail
              </Button>
            </Flex>
          </Flex>
        }
        actions={
          <Flex
            justify="space-between"
            width="100%"
          >
            <Button
              secondary
              onClick={() => setShowDetailsModal(false)}
            >
              Close
            </Button>
            {onDisconnect && (
              <Button
                secondary
                onClick={onDisconnect}
                loading={loading}
                css={{
                  '&&': {
                    color: colors['text-danger-light'],
                    borderColor: colors['border-danger-light'],
                  },
                }}
              >
                Disconnect MCP server from Flow
              </Button>
            )}
          </Flex>
        }
      >
        <McpServerDetailsForm server={server} />
      </Modal>
      <McpAuditModal
        id={server.id}
        name={server.name}
        open={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </>
  )
}

function McpServerDetailsForm({ server }: { server: McpServerFragment }) {
  const { colors } = useTheme()
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <FormField label="MCP server name">
        <Input
          disabled
          inputProps={{ css: { color: colors['text-input-disabled'] } }}
          value={server.name}
        />
      </FormField>
      <FormField label="MCP server url">
        <Input
          disabled
          inputProps={{ css: { color: colors['text-input-disabled'] } }}
          value={server.url}
        />
      </FormField>
      <Switch
        disabled
        checked={!!server.confirm}
      >
        Require confirmation
      </Switch>
    </Flex>
  )
}
