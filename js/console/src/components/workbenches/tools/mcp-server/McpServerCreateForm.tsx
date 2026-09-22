import {
  AddIcon,
  Button,
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Select,
  SidePanelOpenIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import {
  bindingToBindingAttributes,
  FormBindings,
} from 'components/utils/bindings'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { OverlineH3 } from 'components/utils/typography/Text'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import {
  McpHeaderAttributes,
  McpServerAttributes,
  McpServerFragment,
  McpServerProtocol,
  PolicyBindingFragment,
  useUpdateMcpServerMutation,
  useUpsertMcpServerMutation,
  WorkbenchToolType,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import {
  MCP_SERVER_SELECTED_QUERY_PARAM,
  WORKBENCHES_TOOLS_CREATE_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import { WORKBENCHES_TOOLS_TYPE_PARAM } from '../WorkbenchToolCreateOrEdit'
import { useWebhookSetupGuidePanel } from '../../workbench/webhooks/WebhookSetupGuidePanel'
import {
  getWorkbenchToolSetupGuideDocumentationUrl,
  getWorkbenchToolSetupGuideMarkdownPath,
} from '../workbenchToolSetupGuides'

const MCP_SETUP_GUIDE_MARKDOWN_PATH = '/setup-guides/tools/mcp.md'

type HeaderField = McpHeaderAttributes & { id: string }

function newHeaderField(): HeaderField {
  return { id: crypto.randomUUID(), name: '', value: '' }
}

function headersFromServer(server?: McpServerFragment): HeaderField[] {
  const existing =
    server?.authentication?.headers
      ?.filter(
        (header): header is { id: string; name: string; value: string } =>
          !!header?.name
      )
      .map((header) => ({
        id: header.id,
        name: header.name,
        value: header.value ?? '',
      })) ?? []

  return existing.length > 0 ? existing : [newHeaderField()]
}

export function McpServerCreateForm({
  existingServer,
  backPath,
  onSaved,
  showSetupGuideButton = true,
}: {
  existingServer?: McpServerFragment
  backPath?: string
  onSaved?: () => void
  showSetupGuideButton?: boolean
}) {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const isEditing = !!existingServer

  const returnParams = useMemo(
    () =>
      new URLSearchParams({
        [WORKBENCHES_TOOLS_TYPE_PARAM]: WorkbenchToolType.Mcp,
      }),
    []
  )
  const resolvedBackPath =
    backPath ?? `${WORKBENCHES_TOOLS_CREATE_ABS_PATH}?${returnParams}`

  const [name, setName] = useState(existingServer?.name ?? '')
  const [url, setUrl] = useState(existingServer?.url ?? '')
  const [protocol, setProtocol] = useState<McpServerProtocol>(
    existingServer?.protocol ?? McpServerProtocol.StreamableHttp
  )
  const [headers, setHeaders] = useState<HeaderField[]>(() =>
    headersFromServer(existingServer)
  )
  const [readBindings, setReadBindings] = useState<PolicyBindingFragment[]>(
    () =>
      (existingServer?.readBindings?.filter(
        (binding): binding is PolicyBindingFragment => !!binding
      ) ?? []) as PolicyBindingFragment[]
  )

  const attributes = useMemo<Nullable<McpServerAttributes>>(() => {
    const trimmedName = name.trim()
    const trimmedUrl = url.trim()
    if (!trimmedName || !trimmedUrl) return null

    const configuredHeaders = headers
      .map(({ id, name: headerName, value }) => ({
        id,
        name: headerName.trim(),
        value: value.trim(),
      }))
      .filter(({ name: headerName, value }) => headerName && value)

    return {
      name: trimmedName,
      url: trimmedUrl,
      protocol,
      authentication:
        configuredHeaders.length > 0
          ? { headers: configuredHeaders }
          : undefined,
      readBindings: readBindings.map(bindingToBindingAttributes),
    }
  }, [name, url, protocol, headers, readBindings])

  const complete = (server: Nullable<{ id: string; name: string }>) => {
    if (!server) return
    popToast({
      content: `${server.name} ${isEditing ? 'updated' : 'created'}`,
      severity: 'success',
    })
    if (onSaved) {
      onSaved()
      return
    }
    returnParams.set(MCP_SERVER_SELECTED_QUERY_PARAM, server.id)
    navigate(`${WORKBENCHES_TOOLS_CREATE_ABS_PATH}?${returnParams}`)
  }
  const [upsert, { loading: upserting, error: upsertError }] =
    useUpsertMcpServerMutation({
      onCompleted: ({ upsertMcpServer }) => complete(upsertMcpServer),
      refetchQueries: ['McpServers'],
      awaitRefetchQueries: true,
    })
  const [update, { loading: updating, error: updateError }] =
    useUpdateMcpServerMutation({
      onCompleted: ({ updateMcpServer }) => complete(updateMcpServer),
      refetchQueries: ['McpServers'],
      awaitRefetchQueries: true,
    })
  const loading = upserting || updating
  const error = upsertError || updateError

  useEffect(() => {
    if (!isOpen) return
    openSetupGuidePanel({
      markdownPath: MCP_SETUP_GUIDE_MARKDOWN_PATH,
      documentationUrl: getWorkbenchToolSetupGuideDocumentationUrl(
        WorkbenchToolType.Mcp
      ),
    })
  }, [isOpen, openSetupGuidePanel, closeSetupGuidePanel])

  const canSave = !!attributes

  return (
    <Flex
      direction="column"
      gap="medium"
      padding="large"
      minHeight={0}
      width="100%"
      css={{ maxWidth: 980, marginInline: 'auto' }}
    >
      {error && <GqlError error={error} />}

      <Flex
        gap="medium"
        justify={showSetupGuideButton ? undefined : 'center'}
      >
        <FormCardSC css={{ maxWidth: 750, width: '100%' }}>
          <OverlineH3 $color="text-xlight">
            {isEditing ? 'Edit MCP server' : 'New MCP server'}
          </OverlineH3>
          <FormField
            required
            label="Name"
          >
            <Input
              placeholder="MCP server name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField
            required
            label="URL"
            hint="The MCP server endpoint URL."
          >
            <Input
              placeholder="https://example.com/mcp"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </FormField>
          <FormField
            label="Protocol"
            hint="Streamable HTTP is recommended. SSE is deprecated and should only be used when necessary."
          >
            <Select
              selectedKey={protocol}
              onSelectionChange={(key) =>
                setProtocol(
                  (key as McpServerProtocol) ?? McpServerProtocol.StreamableHttp
                )
              }
              selectionMode="single"
              label="Protocol"
            >
              <ListBoxItem
                key={McpServerProtocol.StreamableHttp}
                label="Streamable HTTP"
              />
              <ListBoxItem
                key={McpServerProtocol.Sse}
                label="SSE (deprecated)"
              />
            </Select>
          </FormField>
          <FormField
            label="Headers"
            hint={
              isEditing
                ? 'Header values are secrets. Leave the masked value unchanged to keep the existing secret.'
                : 'Header values are stored as secrets and are not shown after save.'
            }
          >
            <Flex
              direction="column"
              gap="small"
              width="100%"
            >
              {headers.map((header) => {
                const canRemove = headers.length > 1
                return (
                  <HeaderRowSC
                    key={header.id}
                    $showDelete={canRemove}
                  >
                    <Input
                      placeholder="Name"
                      value={header.name}
                      onChange={(e) => {
                        setHeaders((prev) =>
                          prev.map((row) =>
                            row.id === header.id
                              ? { ...row, name: e.target.value }
                              : row
                          )
                        )
                      }}
                    />
                    <InputRevealer
                      placeholder="Value"
                      defaultRevealed={false}
                      value={header.value}
                      onChange={(e) => {
                        setHeaders((prev) =>
                          prev.map((row) =>
                            row.id === header.id
                              ? { ...row, value: e.target.value }
                              : row
                          )
                        )
                      }}
                    />
                    {canRemove && (
                      <DeleteIconButton
                        size="large"
                        onClick={() =>
                          setHeaders((prev) =>
                            prev.filter((row) => row.id !== header.id)
                          )
                        }
                      />
                    )}
                  </HeaderRowSC>
                )
              })}
              <Button
                secondary
                small
                startIcon={<AddIcon />}
                css={{ width: 'auto' }}
                onClick={() =>
                  setHeaders((prev) => [...prev, newHeaderField()])
                }
              >
                Add header
              </Button>
            </Flex>
          </FormField>

          <Flex
            direction="column"
            gap="xsmall"
          >
            <OverlineH3 $color="text-xlight">Read permissions</OverlineH3>
            <FormBindings
              bindings={readBindings}
              setBindings={(next: PolicyBindingFragment[]) =>
                setReadBindings(next)
              }
              hints={{
                user: 'Users with read permissions for this MCP server',
                group: 'Groups with read permissions for this MCP server',
              }}
            />
          </Flex>
          <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
            <Button
              secondary
              as={Link}
              to={resolvedBackPath}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              onClick={() => {
                if (!attributes) return
                if (existingServer)
                  update({
                    variables: { id: existingServer.id, attributes },
                  })
                else upsert({ variables: { attributes } })
              }}
              loading={loading}
              disabled={!canSave}
            >
              Save
            </Button>
          </StickyActionsFooterSC>
        </FormCardSC>
        {showSetupGuideButton && !isOpen && (
          <div css={{ width: 200 }}>
            <Button
              secondary
              startIcon={<SidePanelOpenIcon />}
              width="100%"
              css={{ whiteSpace: 'nowrap' }}
              onClick={() =>
                openSetupGuidePanel({
                  markdownPath:
                    getWorkbenchToolSetupGuideMarkdownPath(
                      WorkbenchToolType.Mcp
                    ) ?? MCP_SETUP_GUIDE_MARKDOWN_PATH,
                  documentationUrl: getWorkbenchToolSetupGuideDocumentationUrl(
                    WorkbenchToolType.Mcp
                  ),
                })
              }
            >
              Setup guide
            </Button>
          </div>
        )}
      </Flex>
    </Flex>
  )
}

const HeaderRowSC = styled.div<{ $showDelete?: boolean }>(
  ({ theme, $showDelete }) => ({
    display: 'grid',
    gridTemplateColumns: $showDelete ? '1fr 1fr auto' : '1fr 1fr',
    gap: theme.spacing.xsmall,
    alignItems: 'center',
    width: '100%',
    '> div:first-of-type, > div:nth-of-type(2)': {
      width: '100%',
      minWidth: 0,
    },
  })
)
