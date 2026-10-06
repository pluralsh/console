import { Flex } from '@pluralsh/design-system'
import { MetadataIcons } from 'components/utils/MetadataIcons'
import { WorkbenchToolIcon } from 'components/workbenches/tools/workbenchToolsUtils'
import { WorkbenchJobFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

// Job author, start time (UTC) and workbench tools.
export function WorkbenchJobMeta({ job }: { job: WorkbenchJobFragment }) {
  const theme = useTheme()
  const jobTools = job.workbench?.tools?.filter(isNonNullable) ?? []

  return (
    <Flex
      gap="medium"
      css={{
        ...theme.partials.text.body2,
        color: theme.colors['text-xlight'],
      }}
    >
      {job.user?.name?.trim() && <span>{job.user.name.trim()}</span>}
      {job.insertedAt && (
        <span>
          {formatDateTime(job.insertedAt, 'YYYY-MM-DD ', false, true)}
          <span css={{ color: theme.colors['code-block-purple'] }}>
            {formatDateTime(job.insertedAt, 'HH:mm:ss', false, true)}
          </span>
          {formatDateTime(job.insertedAt, ' [UTC]', false, true)}
        </span>
      )}
      {!isEmpty(jobTools) && (
        <MetadataIcons
          maxVisibleItems={3}
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
      )}
    </Flex>
  )
}
