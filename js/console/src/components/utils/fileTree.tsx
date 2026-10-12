import { createTheme } from '@mui/material/styles'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { treeItemClasses } from '@mui/x-tree-view/TreeItem'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import styled, { useTheme } from 'styled-components'
import { getFileTypeIconKey } from 'utils/file'

export const StyledTreeView = styled(SimpleTreeView)(({ theme }) => ({
  height: '100%',
  width: '100%',

  [`& .${treeItemClasses.root}`]: {
    marginBottom: theme.spacing.xxxsmall,
    width: '100%',
    paddingLeft: 2,
  },

  [`& .${treeItemClasses.content}`]: {
    borderRadius: theme.borderRadiuses.medium,
    padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
    width: '100%',
    minWidth: 0,
    display: 'flex',
    overflow: 'hidden',

    '&:hover': {
      backgroundColor: theme.colors['fill-zero-hover'],
    },

    '&.Mui-focused, &.Mui-selected, &.Mui-selected.Mui-focused': {
      backgroundColor: theme.colors['fill-zero-selected'],
      color: theme.colors.text,
    },
  },

  [`& .${treeItemClasses.label}`]: {
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },

  [`& .${treeItemClasses.groupTransition}`]: {
    paddingLeft:
      'calc(var(--TreeView-itemChildrenIndentation)) - max(0px, (var(--TreeView-itemDepth) - 2) * 12px))',
    borderLeft: `1px solid ${theme.colors['border']}`,
    margin: `2px 0 2px 14px`,
  },

  [`& .${treeItemClasses.root}.parent-of-selected > .${treeItemClasses.groupTransition}:has(.${treeItemClasses.root}.file-selected)`]:
    {
      borderLeftColor: theme.colors.grey[600],
    },
}))

export const TreeItemIcon = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginRight: theme.spacing.xsmall,
  color: theme.colors['icon-default'],
  flexShrink: 0,
}))

export const TreeItemText = styled.span({
  ...TRUNCATE_LEFT,
  minWidth: 0,
})

// mui components need a proper mui theme where theme.spacing is a function
// otherwise a styled-components theme leaks in and crashes things
export const fileTreeMuiTheme = createTheme()

const FILE_TYPE_ICON_PATH = '/file-type-icons' as const
const FILE_ICON_SIZE = 18

const FILE_TYPE_ICONS: Readonly<Record<string, string>> = {
  dockerfile: `${FILE_TYPE_ICON_PATH}/file_type_docker.svg`,
  helmignore: `${FILE_TYPE_ICON_PATH}/file_type_helm.svg`,
  json: `${FILE_TYPE_ICON_PATH}/file_type_json.svg`,
  yaml: `${FILE_TYPE_ICON_PATH}/file_type_light_yaml.svg`,
  yml: `${FILE_TYPE_ICON_PATH}/file_type_light_yaml.svg`,
  md: `${FILE_TYPE_ICON_PATH}/file_type_markdown.svg`,
  markdown: `${FILE_TYPE_ICON_PATH}/file_type_markdown.svg`,
  license: `${FILE_TYPE_ICON_PATH}/file_type_license.svg`,
  liquid: `${FILE_TYPE_ICON_PATH}/file_type_liquid.svg`,
  lua: `${FILE_TYPE_ICON_PATH}/file_type_lua.svg`,
  toml: `${FILE_TYPE_ICON_PATH}/file_type_light_toml.svg`,
  tpl: `${FILE_TYPE_ICON_PATH}/file_type_templ.svg`,
  tpl_: `${FILE_TYPE_ICON_PATH}/file_type_templ.svg`,
  txt: `${FILE_TYPE_ICON_PATH}/file_type_text.svg`,
} as const

export function FileTypeIcon({
  fileName,
  size = FILE_ICON_SIZE,
}: {
  fileName: string
  size?: number
}) {
  const iconKey = getFileTypeIconKey(fileName)
  const iconPath = iconKey ? FILE_TYPE_ICONS[iconKey.toLowerCase()] : undefined

  if (iconPath) {
    return (
      <img
        src={iconPath}
        alt={iconKey}
        width={size}
        height={size}
      />
    )
  }

  return (
    <FileTypeTextIcon
      extension={iconKey ?? ''}
      size={size}
    />
  )
}

function FileTypeTextIcon({
  extension,
  size,
}: {
  extension: string
  size: number
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        width: size,
        height: size,
        color: theme.colors['text-success'],
        fontFamily: 'Inter',
        fontWeight: 600,
        fontSize: Math.round(size / 2),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {extension.toLowerCase().slice(0, 3)}
    </div>
  )
}
