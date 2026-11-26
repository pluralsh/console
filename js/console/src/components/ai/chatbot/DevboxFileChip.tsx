import { FolderIcon, Tooltip } from '@pluralsh/design-system'
import { FileTypeIcon } from 'components/utils/fileTree'
import { SelectElementIcon } from 'components/utils/icons/SelectElementIcon'
import { InlineA } from 'components/utils/typography/Text'
import escape from 'lodash/escape'
import { createContext, ReactNode, useContext } from 'react'
import type { ExtraProps } from 'react-markdown'
import styled from 'styled-components'
import { ChipBody } from './input/autocomplete/PlrlChipMdRenderers'

import { DEVBOX_ELEMENT_TAG, DEVBOX_FILE_TAG, devboxChip } from './devboxChips'

export {
  DEVBOX_ELEMENT_ATTRIBUTES,
  DEVBOX_ELEMENT_TAG,
  DEVBOX_FILE_ATTRIBUTES,
  DEVBOX_FILE_TAG,
} from './devboxChips'

// opens a path in the devbox files panel, unset outside a devbox transcript;
// `cwd` is the agent's working directory, which its relative links resolve against.
// `openUrl` opens a url in the box's browser, set when the box runs one.
export type DevboxFileOpener = {
  openFile: (path: string) => void
  cwd?: Nullable<string>
  openUrl?: (url: string) => void
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

const LOOPBACK_HOST =
  /^(localhost|[^/]+\.localhost|127(\.\d{1,3}){3}|0\.0\.0\.0|\[::1?\])$/i

// the url to open in the box's browser for a link to a server on the box's own
// loopback, or null for any other link. 0.0.0.0 is a bind address Chromium
// refuses to navigate to, so it's opened as localhost.
export function devboxLocalUrl(href: Nullable<string>): Nullable<string> {
  if (!href) return null
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol) || !LOOPBACK_HOST.test(url.hostname))
    return null
  if (url.hostname === '0.0.0.0' || url.hostname === '[::]')
    url.hostname = 'localhost'
  return url.toString()
}

// a markdown link that opens workspace paths in the devbox files panel, and
// the box's own servers in its browser
export function DevboxMarkdownLink({
  href,
  children,
}: { href?: string; children?: ReactNode } & ExtraProps) {
  const opener = useContext(DevboxFileOpenContext)
  const local = opener?.openUrl && devboxLocalUrl(href)
  const path = !local && opener && devboxLinkPath(href, opener.cwd)

  return (
    <InlineA
      href={href}
      {...(local && {
        title: "Open in the box's browser",
        target: undefined,
        onClick: (e) => {
          e.preventDefault()
          e.stopPropagation()
          opener?.openUrl?.(local)
        },
      })}
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

// an element picked in the box's browser; opens its page there when it can
function DevboxElementChip({
  url,
  selector,
  tag,
  text,
}: {
  url?: string
  selector?: string
  tag?: string
  text?: string
  children?: ReactNode
} & ExtraProps) {
  const openUrl = useContext(DevboxFileOpenContext)?.openUrl
  const chip = devboxChip(DEVBOX_ELEMENT_TAG, { url, selector, tag, text })
  if (!chip) return null
  const local = openUrl && devboxLocalUrl(url)
  const body = (
    <ChipBody icon={<SelectElementIcon size={12} />}>{chip.label}</ChipBody>
  )

  return (
    <Tooltip
      label={<TooltipLinesSC>{chip.title}</TooltipLinesSC>}
      placement="top"
    >
      {local ? (
        <ChipButtonSC
          type="button"
          onClick={() => openUrl(local)}
        >
          {body}
        </ChipButtonSC>
      ) : (
        <span>{body}</span>
      )}
    </Tooltip>
  )
}

export const devboxFileChipComponents = {
  [DEVBOX_FILE_TAG]: DevboxFileChip,
  [DEVBOX_ELEMENT_TAG]: DevboxElementChip,
  [DEVBOX_COMMAND_TAG]: DevboxCommandChip,
}

const TooltipLinesSC = styled.span({
  whiteSpace: 'pre-line',
  wordBreak: 'break-all',
})

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
