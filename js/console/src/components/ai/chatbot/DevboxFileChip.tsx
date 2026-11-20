import { FolderIcon, Tooltip } from '@pluralsh/design-system'
import { FileTypeIcon } from 'components/utils/fileTree'
import { createContext, ReactNode, useContext } from 'react'
import type { ExtraProps } from 'react-markdown'
import styled from 'styled-components'
import { ChipBody } from './input/autocomplete/PlrlChipMdRenderers'

// devbox prompts reference workspace paths with
// <plrl-devbox-file path="/home/plural/repo/main.go"></plrl-devbox-file>; a trailing `/` marks a directory
export const DEVBOX_FILE_TAG = 'plrl-devbox-file'
export const DEVBOX_FILE_ATTRIBUTES = ['path']

// opens a path in the devbox files panel, unset outside a devbox transcript
export const DevboxFileOpenContext =
  createContext<Nullable<(path: string) => void>>(null)

export function DevboxFileChip({
  path,
}: { path?: string; children?: ReactNode } & ExtraProps) {
  const openFile = useContext(DevboxFileOpenContext)
  if (!path) return null

  const directory = path.endsWith('/')
  const name = path.replace(/\/$/, '').split('/').pop() || path
  const chip = (
    <ChipBody
      icon={
        directory ? (
          <FolderIcon size={12} />
        ) : (
          <FileTypeIcon
            fileName={name}
            size={12}
          />
        )
      }
    >
      {directory ? `${name}/` : name}
    </ChipBody>
  )

  return (
    <Tooltip
      label={path}
      placement="top"
    >
      {openFile ? (
        <ChipButtonSC
          type="button"
          onClick={() => openFile(path)}
        >
          {chip}
        </ChipButtonSC>
      ) : (
        <span>{chip}</span>
      )}
    </Tooltip>
  )
}

export const devboxFileChipComponents = { [DEVBOX_FILE_TAG]: DevboxFileChip }

const ChipButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  cursor: 'pointer',
  '&:hover > *': { background: theme.colors['fill-two-hover'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))
