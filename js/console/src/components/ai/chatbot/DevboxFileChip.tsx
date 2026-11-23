import { FolderIcon, Tooltip } from '@pluralsh/design-system'
import { FileTypeIcon } from 'components/utils/fileTree'
import { InlineA } from 'components/utils/typography/Text'
import escape from 'lodash/escape'
import { createContext, ReactNode, useContext } from 'react'
import type { ExtraProps } from 'react-markdown'
import styled from 'styled-components'
import { ChipBody } from './input/autocomplete/PlrlChipMdRenderers'

// devbox prompts reference workspace paths with
// <plrl-devbox-file path="/home/plural/repo/main.go"></plrl-devbox-file>; a trailing `/` marks a directory
export const DEVBOX_FILE_TAG = 'plrl-devbox-file'
export const DEVBOX_FILE_ATTRIBUTES = ['path']

// opens a path in the devbox files panel, unset outside a devbox transcript;
// `cwd` is the agent's working directory, which its relative links resolve against
export type DevboxFileOpener = {
  openFile: (path: string) => void
  cwd?: Nullable<string>
}

export const DevboxFileOpenContext =
  createContext<Nullable<DevboxFileOpener>>(null)

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i

// the absolute workspace path a markdown link points at, or null for external
// links and in-page anchors. Agents suffix paths with `#L12` or `:12:3` for a
// line, which the files panel can't target, so those are dropped.
export function devboxLinkPath(
  href: Nullable<string>,
  cwd: Nullable<string>
): Nullable<string> {
  if (!href || href.startsWith('#') || href.startsWith('//')) return null
  let path = href
  if (URL_SCHEME.test(path)) {
    if (!/^file:/i.test(path)) return null
    path = path.replace(/^file:(\/\/[^/]*)?/i, '')
  }
  path = path.replace(/[?#].*$/, '')
  try {
    path = decodeURIComponent(path)
  } catch {
    // keep a malformed escape as written
  }
  path = path.replace(/:\d+(:\d+)?$/, '')
  if (!path) return null
  if (!path.startsWith('/')) {
    if (!cwd) return null
    path = `${cwd.replace(/\/$/, '')}/${path}`
  }

  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '..') parts.pop()
    else if (part && part !== '.') parts.push(part)
  }
  const directory = /\/\.{0,2}$/.test(path) && parts.length > 0

  return `/${parts.join('/')}${directory ? '/' : ''}`
}

// a markdown link that opens workspace paths in the devbox files panel
export function DevboxMarkdownLink({
  href,
  children,
}: { href?: string; children?: ReactNode } & ExtraProps) {
  const opener = useContext(DevboxFileOpenContext)
  const path = opener && devboxLinkPath(href, opener.cwd)

  return (
    <InlineA
      href={href}
      {...(path && {
        title: path,
        target: undefined,
        onClick: (e) => {
          e.preventDefault()
          e.stopPropagation()
          opener.openFile(path)
        },
      })}
    >
      {children}
    </InlineA>
  )
}

export function DevboxFileChip({
  path,
}: { path?: string; children?: ReactNode } & ExtraProps) {
  const openFile = useContext(DevboxFileOpenContext)?.openFile
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

// display-only: agents only recognize a slash command as a plain `/name` at the
// start of the prompt, so the tag is added when rendering, never sent
export const DEVBOX_COMMAND_TAG = 'plrl-devbox-command'
export const DEVBOX_COMMAND_ATTRIBUTES = ['command']

export function withSlashCommandChip(text: string) {
  return text.replace(
    /^\/([^\s<]+)/,
    (_, command: string) =>
      `<${DEVBOX_COMMAND_TAG} command="${escape(command)}"></${DEVBOX_COMMAND_TAG}>`
  )
}

function DevboxCommandChip({
  command,
}: { command?: string; children?: ReactNode } & ExtraProps) {
  if (!command) return null
  return (
    <ChipBody icon={null}>
      <CommandSC>{`/${command}`}</CommandSC>
    </ChipBody>
  )
}

export const devboxFileChipComponents = {
  [DEVBOX_FILE_TAG]: DevboxFileChip,
  [DEVBOX_COMMAND_TAG]: DevboxCommandChip,
}

const CommandSC = styled.span(({ theme }) => ({
  fontFamily: theme.fontFamilies.mono,
  color: theme.colors['text-primary-accent'],
}))

const ChipButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  cursor: 'pointer',
  '&:hover > *': { background: theme.colors['fill-two-hover'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))
