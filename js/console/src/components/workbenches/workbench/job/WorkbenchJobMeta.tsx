import { Flex, InfoOutlineIcon, Tooltip } from '@pluralsh/design-system'
import { MetadataIcons } from 'components/utils/MetadataIcons'
import { WorkbenchToolIcon } from 'components/workbenches/tools/workbenchToolsUtils'
import { WorkbenchJobFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'
import { formatDateTime, formatLocalizedDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

// Job author, start time (UTC) and workbench tools. `stacked` puts the tools
// on their own line and adds a local time tooltip (Jobs details view).
export function WorkbenchJobMeta({
  job,
  stacked = false,
}: {
  job: WorkbenchJobFragment
  stacked?: boolean
}) {
  const theme = useTheme()
  const jobTools = job.workbench?.tools?.filter(isNonNullable) ?? []
  const tools = !isEmpty(jobTools) && (
    <MetadataIcons
      maxVisibleItems={stacked ? undefined : 3}
      items={jobTools.map((tool) => ({
        id: tool.id,
        label: tool.name,
        icon: (
          <WorkbenchToolIcon
            type={tool.tool}
            provider={tool.cloudConnection?.provider}
            size={12}
          />
        ),
      }))}
    />
  )
  const meta = (
    <Flex
      gap="medium"
      align="center"
      css={{
        ...theme.partials.text.body2,
        color: theme.colors['text-xlight'],
        ...(stacked && {
          flexWrap: 'wrap',
          rowGap: theme.spacing.xxsmall,
          whiteSpace: 'nowrap',
        }),
      }}
    >
      {job.user?.name?.trim() && <span>{job.user.name.trim()}</span>}
      {job.insertedAt && (
        <Flex
          align="center"
          gap="xxsmall"
        >
          <span>
            {formatDateTime(job.insertedAt, 'YYYY-MM-DD ', false, true)}
            <span css={{ color: theme.colors['code-block-purple'] }}>
              {formatDateTime(job.insertedAt, 'HH:mm:ss', false, true)}
            </span>
            {formatDateTime(job.insertedAt, ' [UTC]', false, true)}
          </span>
          {stacked && (
            <Tooltip
              placement="top"
              label={formatLocalizedDateTime(job.insertedAt)}
            >
              <InfoOutlineIcon
                size={10}
                color="icon-light"
                css={{ flexShrink: 0 }}
              />
            </Tooltip>
          )}
        </Flex>
      )}
      {!stacked && tools}
    </Flex>
  )

  if (!stacked) return meta

  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      {meta}
      {tools}
    </Flex>
  )
}
