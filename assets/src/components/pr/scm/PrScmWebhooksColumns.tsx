import { ReactElement } from 'react'
import {
  GitHubLogoIcon,
  GitLabLogoIcon,
  HelpIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled from 'styled-components'

import { ScmType, ScmWebhookFragment } from 'generated/graphql'

import { Edge } from 'utils/graphql'

import { ScmTypeCell } from './PrScmConnectionsColumns'

// import { EditScmWebhookModal } from './EditScmWebhook'

// enum MenuItemKey {
//   Edit = 'edit',
//   Delete = 'delete',
// }

export const columnHelper = createColumnHelper<Edge<ScmWebhookFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Connection name',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const ColOwner = columnHelper.accessor(({ node }) => node?.owner, {
  id: 'owner',
  header: 'Owner',
  cell: function Cell({ getValue }) {
    return <span>{getValue()}</span>
  },
})

const DynamicScmTypeIconSC = styled.div((_) => ({
  position: 'relative',
}))

export const scmTypeToLabel = {
  [ScmType.Github]: 'GitHub',
  [ScmType.Gitlab]: 'GitLab',
  '': 'Unknown',
} as const satisfies Record<ScmType | '', string>

export const scmTypeToIcon = {
  [ScmType.Github]: <GitHubLogoIcon fullColor />,
  [ScmType.Gitlab]: <GitLabLogoIcon fullColor />,
  '': <HelpIcon />,
} as const satisfies Record<ScmType | '', ReactElement>

export function DynamicScmTypeIcon({ type }: { type: Nullable<ScmType> }) {
  const icon = scmTypeToIcon[type || ''] || scmTypeToIcon['']

  return (
    <DynamicScmTypeIconSC>
      <IconFrame
        size="medium"
        type="tertiary"
        icon={icon}
      />
    </DynamicScmTypeIconSC>
  )
}

export const ColType = columnHelper.accessor(({ node }) => node?.type, {
  id: 'type',
  header: 'Provider type',
  cell: ScmTypeCell,
})

// export function DeleteScmWebhookModal({
//   ScmWebhook,
//   open,
//   onClose,
// }: {
//   ScmWebhook: ScmWebhookFragment
//   open: boolean
//   onClose: Nullable<() => void>
// }) {
//   const theme = useTheme()
//   const [mutation, { loading, error }] = useDeleteScmWebhookMutation({
//     variables: { id: ScmWebhook.id },
//     update: (cache, { data }) =>
//       updateCache(cache, {
//         variables: {},
//         query: ScmWebhooksDocument,
//         update: (prev) =>
//           removeConnection(prev, data?.deleteScmWebhook, 'ScmWebhooks'),
//       }),
//     onCompleted: () => {
//       onClose?.()
//     },
//   })

//   return (
//     <Confirm
//       close={() => onClose?.()}
//       destructive
//       label="Delete"
//       loading={loading}
//       error={error}
//       open={open}
//       submit={() => mutation()}
//       title="Delete SCM connection"
//       text={
//         <>
//           Are you sure you want to delete the{' '}
//           <span css={{ color: theme.colors['text-danger'] }}>
//             “{ScmWebhook.name}”
//           </span>{' '}
//           connection?
//         </>
//       }
//     />
//   )
// }

// export const ColActions = columnHelper.accessor(({ node }) => node, {
//   id: 'actions',
//   header: '',
//   cell: function Cell({ getValue }) {
//     const theme = useTheme()
//     const ScmWebhook = getValue()
//     const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()

//     if (!ScmWebhook) {
//       return null
//     }

//     return (
//       <div
//         onClick={(e) => e.stopPropagation()}
//         css={{
//           alignItems: 'center',
//           alignSelf: 'end',
//           display: 'flex',
//           gap: theme.spacing.small,
//         }}
//       >
//         <IconFrame
//           size="medium"
//           clickable
//           icon={<PencilIcon />}
//           textValue="Edit"
//           onClick={() => setMenuKey(MenuItemKey.Edit)}
//         />
//         <DeleteIconButton onClick={() => setMenuKey(MenuItemKey.Delete)} />
//         {/* Modals */}
//         <DeleteScmWebhookModal
//           ScmWebhook={ScmWebhook}
//           open={menuKey === MenuItemKey.Delete}
//           onClose={() => setMenuKey('')}
//         />
//         <EditScmWebhookModal
//           // refetch={refetch}
//           ScmWebhook={ScmWebhook}
//           open={menuKey === MenuItemKey.Edit}
//           onClose={() => setMenuKey('')}
//         />
//       </div>
//     )
//   },
// })

export const columns = [ColType, ColName, ColType, ColOwner]
