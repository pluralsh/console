import {
  Card,
  Chip,
  Flex,
  FormField,
  ListBoxItem,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'

const GRAPHQL_SCOPE_VALUES = [
  'agent.read',
  'agent.write',
  'catalog.read',
  'catalog.write',
  'catalog.writes',
  'cluster.read',
  'cluster.write',
  'flow.read',
  'flow.write',
  'global.read',
  'global.write',
  'integrations.read',
  'integrations.write',
  'observer.read',
  'observer.write',
  'pipeline.read',
  'pipeline.write',
  'project.read',
  'project.write',
  'repos.read',
  'repos.write',
  'self_service.read',
  'self_service.write',
  'sentinel.read',
  'sentinel.write',
  'service.context.read',
  'service.context.write',
  'service.read',
  'service.write',
  'settings.read',
  'settings.write',
  'stack.read',
  'stack.write',
  'user.read',
  'user.write',
  'workbench.read',
  'workbench.write',
]

export function AccessTokensCreateScope({
  selectedScopes,
  setSelectedScopes,
}: {
  selectedScopes: string[]
  setSelectedScopes: (s: string[]) => void
}) {
  const theme = useTheme()
  const selectedScopeSet = useMemo(
    () => new Set(selectedScopes),
    [selectedScopes]
  )

  const removeScope = (scope: string) =>
    setSelectedScopes(selectedScopes.filter((s) => s !== scope))

  const sortedScopes = useMemo(
    () => [...GRAPHQL_SCOPE_VALUES].sort((a, b) => a.localeCompare(b)),
    []
  )

  const selectionCountLabel = `${selectedScopes.length} scope${
    selectedScopes.length === 1 ? '' : 's'
  } selected`

  return (
    <Card
      css={{
        '&&': {
          marginTop: theme.spacing.medium,
          padding: theme.spacing.medium,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
        },
      }}
      fillLevel={2}
    >
      <FormField
        label="Scopes"
        hint="Choose GraphQL scopes for this token, or leave empty to allow all scopes."
      >
        <Select
          label="Scopes"
          selectionMode="multiple"
          selectedKeys={selectedScopeSet}
          onSelectionChange={(keys) =>
            setSelectedScopes(Array.from(keys).map((key) => String(key)))
          }
          triggerButton={
            <SelectButton>
              <Flex
                align="center"
                gap="xsmall"
              >
                <Chip
                  fillLevel={3}
                  size="small"
                >
                  {selectedScopes.length}
                </Chip>
                <span>{selectionCountLabel}</span>
              </Flex>
            </SelectButton>
          }
        >
          {sortedScopes.map((scope) => (
            <ListBoxItem
              key={scope}
              label={scope}
            />
          ))}
        </Select>
      </FormField>
      {selectedScopes.length > 0 && (
        <Flex
          gap="xsmall"
          wrap="wrap"
        >
          {selectedScopes.map((scope) => (
            <Chip
              key={scope}
              size="small"
              closeButton
              clickable
              onClick={() => removeScope(scope)}
            >
              {scope}
            </Chip>
          ))}
        </Flex>
      )}
    </Card>
  )
}
