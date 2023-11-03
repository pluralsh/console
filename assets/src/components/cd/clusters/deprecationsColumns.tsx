import { Button, GitHubLogoIcon } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ApiDeprecation } from 'generated/graphql'

import { StackedText } from './Clusters'

const columnHelperDeprecations = createColumnHelper<ApiDeprecation>()

export const deprecationsColumns = [
  columnHelperDeprecations.accessor(({ component }) => component, {
    id: 'deprecated',
    header: 'Deprecated',
    meta: { truncate: true },
    cell: ({
      row: {
        original: { component, ...deprecation },
      },
    }) => (
      <StackedText
        first={`${component?.group}/${component?.version} ${component?.kind} ${component?.name}`}
        second={`removed in ${deprecation.removedIn}`}
      />
    ),
  }),
  columnHelperDeprecations.accessor(({ replacement }) => replacement, {
    id: 'fix',
    header: 'Fix',
    meta: { truncate: true },
    cell: ({ getValue, row: { original } }) => {
      const replacement = getValue()

      if (!replacement) return <div>Permanently Removed</div>

      return (
        <div>
          {getValue()} {original.component?.kind}
        </div>
      )
    },
  }),
  columnHelperDeprecations.accessor(({ component }) => component?.service, {
    id: 'repository',
    header: 'Repository',
    cell: ({ getValue }) => {
      const service = getValue()
      const urlFormat = service?.repository?.urlFormat
      const httpsPath = service?.repository?.httpsPath
      const ref = service?.git?.ref
      const folder = service?.git?.folder

      if (!urlFormat || !httpsPath || !ref) return null

      const url = urlFormat
        .replace(`{url}`, httpsPath)
        .replace('{ref}', ref)
        .replace('{folder}', folder || '')

      return (
        <div css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}>
          <Button
            small
            floating
            width="fit-content"
            startIcon={<GitHubLogoIcon />}
            as="a"
            href={url}
            target="_blank"
            rel="noopener noreferer"
          >
            Fix now
          </Button>
        </div>
      )
    },
  }),
]
