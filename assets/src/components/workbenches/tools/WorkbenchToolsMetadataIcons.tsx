import { Flex, Tooltip } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { Provider } from 'generated/graphql'
import { WorkbenchToolIcon } from './workbenchToolsUtils'

const DEFAULT_MAX_VISIBLE_TOOLS = 5
const DEFAULT_ICON_SIZE = 10

export type WorkbenchToolsMetadataIconItem = {
  id: string
  name: string
  tool: Nullable<string>
  cloudConnection?: {
    provider?: Nullable<Provider>
  } | null
}

export function WorkbenchToolsMetadataIcons({
  tools,
  maxVisibleTools = DEFAULT_MAX_VISIBLE_TOOLS,
  iconSize = DEFAULT_ICON_SIZE,
}: {
  tools: WorkbenchToolsMetadataIconItem[]
  maxVisibleTools?: number
  iconSize?: number
}) {
  if (!tools.length) return null

  const visibleTools = tools.slice(0, maxVisibleTools)
  const hiddenCount = tools.length - visibleTools.length
  const hiddenToolsLabel = tools
    .slice(maxVisibleTools)
    .map(({ name }) => name)
    .join(', ')

  return (
    <Flex
      align="center"
      gap="xsmall"
      wrap="nowrap"
    >
      {visibleTools.map((tool) => (
        <Tooltip
          key={tool.id}
          label={tool.name}
          placement="bottom"
        >
          <Flex
            align="center"
            justify="center"
            css={{
              height: iconSize,
              lineHeight: 0,
              width: iconSize,
            }}
          >
            <WorkbenchToolIcon
              type={tool.tool}
              provider={tool.cloudConnection?.provider}
              size={iconSize}
            />
          </Flex>
        </Tooltip>
      ))}
      {hiddenCount > 0 && (
        <Tooltip
          label={hiddenToolsLabel || `${hiddenCount} more`}
          placement="bottom"
        >
          <CaptionP
            $color="text-xlight"
            css={{ whiteSpace: 'nowrap' }}
          >
            +{hiddenCount}
          </CaptionP>
        </Tooltip>
      )}
    </Flex>
  )
}
