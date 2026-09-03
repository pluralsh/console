import {
  FormField,
  ListBoxFooter,
  ListBoxItem,
  Select,
  McpLogoIcon,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { useMcpServersQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useEffectEvent, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MCP_SERVER_SELECTED_QUERY_PARAM,
  WORKBENCHES_TOOLS_CREATE_MCP_SERVER_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

export function McpServerSelectField({
  selectedId,
  onChange,
}: {
  selectedId: Nullable<string>
  onChange: (id: string | null) => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()

  const { data, loading } = useMcpServersQuery({
    variables: { first: 100 },
    fetchPolicy: 'cache-and-network',
  })

  const servers = useMemo(() => mapExistingNodes(data?.mcpServers), [data])

  const consumedSelectedParam = useEffectEvent((selectedParam: string) => {
    onChange(selectedParam)
    const next = new URLSearchParams(searchParams)
    next.delete(MCP_SERVER_SELECTED_QUERY_PARAM)
    setSearchParams(next, { replace: true })
  })

  useEffect(() => {
    const selectedParam = searchParams.get(MCP_SERVER_SELECTED_QUERY_PARAM)
    if (!selectedParam) return
    consumedSelectedParam(selectedParam)
  }, [searchParams])

  const selectedServer = servers.find((s) => s.id === selectedId)

  return (
    <FormField
      required
      label="MCP server"
      hint="Select an existing MCP server or create a new one."
      caption={
        <InlineLink
          as={Link}
          to={WORKBENCHES_TOOLS_CREATE_MCP_SERVER_ABS_PATH}
        >
          Create new MCP server
        </InlineLink>
      }
    >
      <Select
        selectedKey={selectedId || null}
        leftContent={selectedServer ? <McpLogoIcon fullColor /> : undefined}
        onSelectionChange={(key) => onChange(key ? String(key) : null)}
        label="MCP server"
        {...(isEmpty(servers) &&
          (loading
            ? {
                isDisabled: true,
                triggerButton: (
                  <RectangleSkeleton
                    $bright
                    $height="xlarge"
                    $width="100%"
                  />
                ),
              }
            : {
                dropdownFooter: (
                  <ListBoxFooter>No MCP servers found</ListBoxFooter>
                ),
              }))}
      >
        {servers.map((server) => (
          <ListBoxItem
            key={server.id}
            leftContent={<McpLogoIcon fullColor />}
            label={server.name}
            description={server.url}
          />
        ))}
      </Select>
    </FormField>
  )
}
