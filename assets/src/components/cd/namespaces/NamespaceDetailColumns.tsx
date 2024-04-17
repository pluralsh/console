import { Chip, GitHubLogoIcon, Tooltip } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { getProviderIconUrl } from 'components/utils/Provider'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'

import { ManagedNamespace } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { shortenSha1 } from 'utils/sha'

const columnHelper = createColumnHelper<ManagedNamespace['service']>()

export const ColName = columnHelper.accessor((service) => service?.name, {
  id: 'name',
  header: 'Name',
  meta: { truncate: true, gridTemplate: 'minmax(180px,1fr)' },
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

export const ColTemplated = columnHelper.accessor(
  (service) => service?.templated,
  {
    id: 'templated',
    header: 'Templated',
    meta: { truncate: true, gridTemplate: 'minmax(180px,300px)' },
    cell: function Cell({ getValue }) {
      const templated = getValue()

      return (
        <Chip
          severity={templated ? 'success' : 'danger'}
          css={{ width: 'fit-content' }}
        >
          {templated ? 'True' : 'False'}
        </Chip>
      )
    },
  }
)

export const ColRef = columnHelper.accessor((service) => service, {
  id: 'gitLocation',
  header: 'Reference',
  meta: { truncate: true, gridTemplate: 'minmax(180px,1fr)' },
  cell: ({ getValue }) => {
    const svc = getValue()

    if (!svc) return null

    const refStr = shortenSha1(svc.git?.ref || '')

    return (
      <>
        {svc.helm?.chart && svc.helm?.version && (
          <span>
            {svc.helm?.chart}@{svc.helm?.version}
          </span>
        )}
        {svc.git && (
          <Tooltip
            placement="top"
            label={`${refStr}@${svc.git?.folder}`}
          >
            <span>
              {refStr}@{svc.git?.folder}
            </span>
          </Tooltip>
        )}
      </>
    )
  },
})

export const ColRepo = columnHelper.accessor((service) => service, {
  id: 'repository',
  header: 'Repository',
  meta: { truncate: true, gridTemplate: 'minmax(180px,1fr)' },
  cell: ({ getValue }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()
    const svc = getValue()
    const git = svc?.repository
    const helm = svc?.helm?.repository
    const url = git?.url || ''

    return (
      <Tooltip
        placement="top-start"
        label={url}
      >
        <div>
          <ColWithIcon
            truncateLeft
            icon={
              helm ? getProviderIconUrl('byok', theme.mode) : <GitHubLogoIcon />
            }
          >
            <span>{helm ? helm.name : url}</span>
          </ColWithIcon>
        </div>
      </Tooltip>
    )
  },
})
