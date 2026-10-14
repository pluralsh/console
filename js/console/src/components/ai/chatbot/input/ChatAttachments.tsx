import { CloseIcon, PaperclipIcon, Tooltip } from '@pluralsh/design-system'
import { FileTypeIcon } from 'components/utils/fileTree'
import { AttachmentFragment } from 'generated/graphql'
import { uniqBy } from 'lodash'
import { ReactNode, useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchFilesAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { formatFileSize, isImageFile } from 'utils/file'
import { toWorkbenchPath } from 'components/workbenches/workbench/files/workbenchFilePaths'

export type AttachmentShelfItem = {
  key: string
  name: string
  size?: Nullable<number>
  imageUrl?: Nullable<string>
  href?: Nullable<string>
  /** an in-app route, taking precedence over `href` */
  to?: Nullable<string>
  onRemove?: () => void
}

const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`

export function mergeAttachments(current: File[], added: File[]): File[] {
  return uniqBy([...current, ...added], fileKey)
}

// object urls for pending image previews, revoked whenever the file list changes
export function usePendingAttachmentItems(
  files: File[],
  onChange: (files: File[]) => void
): AttachmentShelfItem[] {
  const previews = useMemo(
    () => files.map((f) => (isImageFile(f) ? URL.createObjectURL(f) : null)),
    [files]
  )

  useEffect(
    () => () => previews.forEach((url) => url && URL.revokeObjectURL(url)),
    [previews]
  )

  const remove = useCallback(
    (key: string) => onChange(files.filter((f) => fileKey(f) !== key)),
    [files, onChange]
  )

  return files.map((file, i) => ({
    key: fileKey(file),
    name: file.name,
    size: file.size,
    imageUrl: previews[i],
    onRemove: () => remove(fileKey(file)),
  }))
}

// links to the workbench's file viewer when its filesystem is available, else the raw download
export function attachmentShelfItems(
  attachments: Nullable<Nullable<AttachmentFragment>[]>,
  workbenchId?: Nullable<string>
): AttachmentShelfItem[] {
  return (attachments ?? []).flatMap((a) =>
    a
      ? [
          {
            key: a.id,
            name: a.filename,
            size: a.size,
            href: a.downloadUrl,
            to: workbenchId
              ? getWorkbenchFilesAbsPath(workbenchId, toWorkbenchPath(a.path))
              : null,
            imageUrl: isImageFile({
              name: a.filename,
              type: a.filetype ?? undefined,
            })
              ? a.downloadUrl
              : null,
          },
        ]
      : []
  )
}

export function AttachmentShelf({
  items,
  compact = false,
  ...props
}: {
  items: AttachmentShelfItem[]
  /** smaller thumbnails and chips, without sizes, for sent messages */
  compact?: boolean
} & React.ComponentPropsWithoutRef<'div'>) {
  if (items.length === 0) return null

  return (
    <ShelfSC
      $compact={compact}
      {...props}
    >
      {items.map((item) =>
        item.imageUrl ? (
          <ImageAttachment
            key={item.key}
            item={item}
          />
        ) : (
          <FileAttachment
            key={item.key}
            item={item}
            compact={compact}
          />
        )
      )}
    </ShelfSC>
  )
}

function ImageAttachment({ item }: { item: AttachmentShelfItem }) {
  const image = (
    <ImageThumbSC
      src={item.imageUrl ?? undefined}
      alt={item.name}
    />
  )

  return (
    <Tooltip
      label={item.name}
      placement="top"
    >
      <AttachmentItemSC>
        <AttachmentLink item={item}>{image}</AttachmentLink>
        {item.onRemove && <RemoveButton onClick={item.onRemove} />}
      </AttachmentItemSC>
    </Tooltip>
  )
}

function FileAttachment({
  item,
  compact,
}: {
  item: AttachmentShelfItem
  compact: boolean
}) {
  const body = (
    <FileChipSC className="file-chip">
      <FileTypeIcon
        fileName={item.name}
        size={compact ? 12 : 16}
      />
      <span className="name">{item.name}</span>
      {!compact && item.size != null && (
        <span className="size">{formatFileSize(item.size)}</span>
      )}
    </FileChipSC>
  )

  return (
    <AttachmentItemSC>
      <AttachmentLink item={item}>{body}</AttachmentLink>
      {item.onRemove && <RemoveButton onClick={item.onRemove} />}
    </AttachmentItemSC>
  )
}

function AttachmentLink({
  item,
  children,
}: {
  item: AttachmentShelfItem
  children: ReactNode
}) {
  if (item.to)
    return (
      <Link
        to={item.to}
        css={{ textDecoration: 'none' }}
      >
        {children}
      </Link>
    )
  if (item.href)
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        css={{ textDecoration: 'none' }}
      >
        {children}
      </a>
    )
  return children
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <RemoveButtonSC
      type="button"
      aria-label="Remove attachment"
      className="remove"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <CloseIcon size={8} />
    </RemoveButtonSC>
  )
}

export function DropOverlay() {
  return (
    <DropOverlaySC>
      <PaperclipIcon size={20} />
      <span>Drop files to attach</span>
    </DropOverlaySC>
  )
}

const ShelfSC = styled.div<{ $compact: boolean }>(({ theme, $compact }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: theme.spacing.xsmall,
  ...($compact && {
    img: { width: 36, height: 36 },
    '.file-chip': {
      height: 24,
      maxWidth: 180,
      padding: `0 ${theme.spacing.xsmall}px`,
      gap: theme.spacing.xxsmall,
    },
  }),
}))

const AttachmentItemSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  borderRadius: theme.borderRadiuses.medium,
  '&:hover .remove, &:focus-within .remove': { opacity: 1 },
}))

const ImageThumbSC = styled.img(({ theme }) => ({
  display: 'block',
  width: 56,
  height: 56,
  objectFit: 'cover',
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders['fill-two'],
  background: theme.colors['fill-two'],
  transition: 'border-color 0.1s ease-in-out',
  'a:hover &, button:hover &': {
    borderColor: theme.colors['border-fill-two'],
  },
}))

const FileChipSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  height: 32,
  maxWidth: 240,
  padding: `0 ${theme.spacing.small}px 0 ${theme.spacing.xsmall}px`,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders['fill-two'],
  background: theme.colors['fill-two'],
  color: theme.colors.text,
  transition: 'background 0.1s ease-in-out, border-color 0.1s ease-in-out',
  'a:hover &, button:hover &': {
    background: theme.colors['fill-two-hover'],
  },
  '.name': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  '.size': {
    color: theme.colors['text-xlight'],
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
}))

const RemoveButtonSC = styled.button(({ theme }) => ({
  position: 'absolute',
  top: -6,
  right: -6,
  width: 18,
  height: 18,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: theme.borders.input,
  background: theme.colors['fill-three'],
  color: theme.colors['icon-light'],
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity 0.1s ease-in-out, background 0.1s ease-in-out',
  boxShadow: theme.boxShadows.slight,
  '&:hover': {
    background: theme.colors['fill-three-hover'],
    color: theme.colors['icon-danger'],
  },
}))

const DropOverlaySC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.xsmall,
  borderRadius: theme.borderRadiuses.large,
  border: `1.5px dashed ${theme.colors['border-primary']}`,
  background: `${theme.colors['fill-zero-selected']}ee`,
  color: theme.colors.text,
  pointerEvents: 'none',
}))

export function withAttachmentHint(placeholder: string) {
  return `${placeholder.trim().replace(/[.\s]+$/, '')}. Drag and drop or paste files to attach.`
}
