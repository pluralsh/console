import {
  FolderIcon,
  ListBoxItem,
  PaperclipIcon,
  Tooltip,
} from '@pluralsh/design-system'
import {
  AttachmentShelf,
  DropOverlay,
  mergeAttachments,
  usePendingAttachmentItems,
} from 'components/ai/chatbot/input/ChatAttachments'
import { ChatInputIconFrame } from 'components/ai/chatbot/input/ChatInputIconFrame'
import { FileTypeIcon } from 'components/utils/fileTree'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxCommandFragment,
  DevboxConfigOptionFragment,
} from 'generated/graphql'
import { EditableDiv } from 'components/utils/EditableDiv'
import { KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import styled from 'styled-components'
import { formatFileSize } from 'utils/file'
import { isNonNullable } from 'utils/isNonNullable'
import {
  WorkbenchPromptCancelButton,
  WorkbenchPromptOptionsGroup,
  WorkbenchPromptSubmitButton,
} from '../WorkbenchPromptControls'
import {
  AUTONOMY_CATEGORY,
  autonomyChoices,
  DevboxAutonomyPolicy,
  isAutonomyOption,
  MODE_CATEGORY,
} from './devboxAutonomy'
import {
  caretOffset,
  directoryToken,
  fileMentionChip,
  getMentionQuery,
  matchFiles,
  mentionPath,
  mentionRoot,
  replaceAtCaret,
  resolveMentionDir,
  useDevboxDirectory,
  useDevboxFileSearch,
} from './devboxFileMentions'
import { AutonomyPillSelect, PillSelect } from './DevboxPromptPills'
import {
  getSlashQuery,
  groupSlashCommands,
  matchSlashCommands,
  SLASH_COMMAND_ATTR,
  slashCommandChip,
  slashCommandHint,
} from './devboxSlashCommands'
import { DevboxModelLabel, DevboxModelProviderIcon } from './DevboxChips'
import { MODEL_CATEGORY, proxyModelOf } from './devboxStartForm'

// the pickers worth a slot in the composer; agents' extras (Codex's collaboration and fast modes) stay at their defaults
const COMPOSER_CATEGORIES = [MODEL_CATEGORY, 'thought_level', AUTONOMY_CATEGORY]

// the agent's own mode picker only shows when there's no autonomy setting to stand in for it; autonomy goes last
export function composerOptions(
  configOptions: Nullable<Nullable<DevboxConfigOptionFragment>[]>
) {
  const offered = (configOptions ?? [])
    .filter(isNonNullable)
    .filter((o) => o.options?.length)
  const hasAutonomy = offered.some(isAutonomyOption)
  return offered
    .filter(
      (o) =>
        COMPOSER_CATEGORIES.includes(o.category ?? '') ||
        (!hasAutonomy && o.category === MODE_CATEGORY)
    )
    .sort((a, b) => Number(isAutonomyOption(a)) - Number(isAutonomyOption(b)))
}
import { DevboxSuggestion, DevboxSuggestionMenu } from './DevboxSuggestionMenu'
import { DevboxFileEntry, isDirectory } from './devboxWorkspaceApi'

const MAX_SUGGESTIONS = 50

// console and the devbox daemon reject prompts over these limits
export const MAX_ATTACHMENTS = 10
export const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024

export function attachmentError(files: File[]): Nullable<string> {
  if (files.length > MAX_ATTACHMENTS)
    return `At most ${MAX_ATTACHMENTS} files can be attached to a prompt`
  const total = files.reduce((sum, f) => sum + f.size, 0)
  if (total > MAX_ATTACHMENT_BYTES)
    return `Attachments total ${formatFileSize(total)}, more than the ${formatFileSize(MAX_ATTACHMENT_BYTES)} allowed per prompt`
  return null
}

const NO_FILES: File[] = []

type ConfigValue = NonNullable<
  NonNullable<DevboxConfigOptionFragment['options']>[number]
>

// the proxy's models under the IDs the agent knows them by (OpenCode prefixes
// `plural/`), keeping the current value when it's an alias like Default
export function proxyModelValues(
  option: DevboxConfigOptionFragment,
  proxyModels: string[]
): ConfigValue[] {
  const reported = (option.options ?? []).filter(isNonNullable)
  const values = proxyModels.map(
    (id) =>
      reported.find((o) => o.value === id || o.value === `plural/${id}`) ?? {
        value: id,
      }
  )
  const current = reported.find((o) => o.value === option.currentValue)
  return current && !values.some((v) => v.value === current.value)
    ? [current, ...values]
    : values
}

export function DevboxComposer({
  commands,
  configOptions,
  autonomyPolicy,
  proxyBilled = false,
  modelSwitchable = true,
  proxyModels,
  listFiles,
  searchFiles,
  running = false,
  disabled = false,
  placeholder = 'Message the agent, / for commands or @ for files',
  allowEmpty = false,
  autoFocus = false,
  toolbar,
  onSubmit,
  onCancel,
  onSetConfigOption,
}: {
  commands: Nullable<Nullable<DevboxCommandFragment>[]>
  configOptions?: Nullable<Nullable<DevboxConfigOptionFragment>[]>
  autonomyPolicy?: Nullable<DevboxAutonomyPolicy>
  proxyBilled?: boolean
  modelSwitchable?: boolean
  // replaces the agent's own model values, which needn't list the proxy's
  proxyModels?: Nullable<string[]>
  // completes `@path` mentions against the instance's files
  listFiles?: Nullable<
    (path: string, opts?: { brief?: boolean }) => Promise<DevboxFileEntry[]>
  >
  // searches beneath the directory being completed once a name is typed;
  // without it, names are matched against the directory's listing
  searchFiles?: Nullable<
    (path: string, query: string) => Promise<DevboxFileEntry[]>
  >
  running?: boolean
  disabled?: boolean
  placeholder?: string
  allowEmpty?: boolean
  autoFocus?: boolean
  // extra controls beside the attach button
  toolbar?: ReactNode
  // resolving to false (a failed send) keeps the draft
  onSubmit: (
    prompt: string,
    attachments: File[]
  ) => void | boolean | Promise<boolean>
  onCancel?: () => void
  onSetConfigOption?: (configId: string, value: string) => void
}) {
  const [text, setText] = useState('')
  const [caret, setCaret] = useState(0)
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState<Nullable<string>>(null)
  const [files, setFiles] = useState<File[]>(NO_FILES)
  const [sending, setSending] = useState(false)
  // directories browsed into (typed token → absolute path)
  const [mentions, setMentions] = useState<Record<string, string>>({})
  const ref = useRef<HTMLDivElement>(null)
  const draft = useRef({ text, files })
  useEffect(() => {
    draft.current = { text, files }
  }, [text, files])

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const onSelectionChange = () => {
      const node = ref.current
      const sel = document.getSelection()
      if (node && sel?.rangeCount && node.contains(sel.anchorNode))
        setCaret(caretOffset(node))
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () =>
      document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  const addFiles = (added: File[]) =>
    added.length > 0 && setFiles((cur) => mergeAttachments(cur, added))
  const fileItems = usePendingAttachmentItems(files, setFiles)
  const fileError = attachmentError(files)
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: addFiles,
    noClick: true,
    noKeyboard: true,
    disabled,
  })

  const slash = getSlashQuery(text, caret)
  const commandMatches = slash
    ? groupSlashCommands(
        matchSlashCommands(commands, slash.query).slice(0, MAX_SUGGESTIONS)
      ).flatMap((g) => g.items.map((cmd) => ({ cmd, group: g.label })))
    : []
  const mention = !slash && listFiles ? getMentionQuery(text, caret) : null
  const directory = useDevboxDirectory(listFiles, mention?.dir)
  // a typed name searches everything beneath the directory, not just its listing
  const searching = !!searchFiles && !!mention?.leaf
  const search = useDevboxFileSearch(
    searchFiles,
    searching ? mention.dir : null,
    mention?.leaf ?? ''
  )
  const listing = searching ? search : directory
  const root = mention
    ? mentionRoot(mention.dir, mentions, directory.entries)
    : null
  const fileMatches = !mention
    ? []
    : (searching
        ? search.entries
        : matchFiles(directory.entries, mention.leaf)
      ).slice(0, MAX_SUGGESTIONS)
  // browsing into a directory offers it first, so folders can be mentioned too
  const folder =
    mention && !mention.leaf && !directory.loading && !directory.error
      ? resolveMentionDir(mention.dir, mentions, directory.entries)
      : null

  const suggestions: DevboxSuggestion[] = slash
    ? commandMatches.map(({ cmd, group }) => ({
        key: cmd.name,
        title: `/${cmd.name}`,
        subtitle: cmd.description,
        group,
        mono: true,
      }))
    : [
        ...(folder
          ? [
              {
                key: `folder:${folder}`,
                title: mention?.dir ?? folder,
                subtitle: 'Mention this folder',
                icon: <FolderIcon size={14} />,
              },
            ]
          : []),
        ...fileMatches.map((entry) => ({
          key: entry.path,
          title: isDirectory(entry) ? `${entry.name}/` : entry.name,
          subtitle:
            searching && mention
              ? mentionPath(mention, root, entry.path)
              : entry.path,
          icon: isDirectory(entry) ? (
            <FolderIcon size={14} />
          ) : (
            <FileTypeIcon
              fileName={entry.name}
              size={14}
            />
          ),
          kind: entry.gitStatus ?? undefined,
        })),
      ]
  const menuOpen =
    dismissed !== text &&
    (slash ? suggestions.length > 0 : !!mention && !disabled)
  const hint = slashCommandHint(text, commands)

  const update = (value: string) => {
    setText(value)
    setCaret(ref.current ? caretOffset(ref.current) : value.length)
    setActive(0)
  }

  // swaps the token under the caret, swallowing one space after it
  const replaceToken = (
    start: number,
    end: number,
    replacement: HTMLElement | string
  ) => {
    const node = ref.current
    const sel = document.getSelection()
    if (!node || !sel?.rangeCount) return
    // focusing an unfocused contenteditable moves the caret to its start
    const saved = sel.getRangeAt(0).cloneRange()
    node.focus()
    sel.removeAllRanges()
    sel.addRange(saved)
    const after = end - caret + (text[end] === ' ' ? 1 : 0)
    replaceAtCaret(node, caret - start, after, replacement)
  }

  const pick = (idx: number) => {
    if (slash) {
      const cmd = commandMatches[idx]?.cmd
      if (cmd) replaceToken(0, slash.end, slashCommandChip(cmd.name))
      return
    }
    if (!mention) return
    if (folder && idx === 0)
      return replaceToken(mention.start, mention.end, fileMentionChip(folder))
    const entry = fileMatches[folder ? idx - 1 : idx]
    if (!entry) return
    if (!isDirectory(entry))
      return replaceToken(
        mention.start,
        mention.end,
        fileMentionChip(entry.path)
      )
    const { token, path } = directoryToken(mention, entry, root)
    setMentions((cur) => ({ ...cur, [token]: path }))
    replaceToken(mention.start, mention.end, `@${token}`)
  }

  const canSubmit =
    (allowEmpty || !!text.trim() || files.length > 0) && !fileError && !sending
  const submit = () => {
    if (!canSubmit || disabled) return
    const sent = { text, files }
    // only clear what was sent; the user may have kept typing while it was in flight
    const clear = (ok: void | boolean) => {
      if (ok === false) return
      if (draft.current.text === sent.text && ref.current) {
        ref.current.innerHTML = ''
        update('')
        setMentions({})
      }
      if (draft.current.files === sent.files) setFiles(NO_FILES)
    }
    const result = onSubmit(text.trim(), files)
    if (!(result instanceof Promise)) return clear(result)
    setSending(true)
    result.then(clear, () => undefined).finally(() => setSending(false))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (menuOpen) {
      const count = suggestions.length
      if (e.key === 'Escape') {
        e.preventDefault()
        setDismissed(text)
        return
      }
      if (count > 0 && e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => (i + 1) % count)
        return
      }
      if (count > 0 && e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (i - 1 + count) % count)
        return
      }
      if (count > 0 && (e.key === 'Enter' || e.key === 'Tab')) {
        e.preventDefault()
        pick(Math.min(active, count - 1))
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const options = composerOptions(configOptions)

  return (
    <ComposerSC {...getRootProps()}>
      <input
        {...getInputProps()}
        aria-label="Attach files"
      />
      {isDragActive && <DropOverlay />}
      <AttachmentShelf items={fileItems} />
      {menuOpen && (
        <DevboxSuggestionMenu
          label={slash ? 'Slash commands' : 'Files'}
          items={suggestions}
          active={active}
          loading={listing.loading}
          empty={
            !listing.error
              ? undefined
              : searching
                ? "Couldn't search files"
                : "Couldn't list this directory"
          }
          onPick={pick}
          onHover={setActive}
        />
      )}
      <PromptSC
        ref={ref}
        role="textbox"
        aria-label="Prompt"
        aria-multiline
        disabled={disabled}
        placeholder={placeholder}
        setValue={update}
        onKeyDown={onKeyDown}
        onPasteFiles={addFiles}
      />
      {hint && (
        <CaptionP
          $color="text-xlight"
          data-testid="slash-hint"
        >
          {hint}
        </CaptionP>
      )}
      {fileError && (
        <CaptionP
          $color="text-danger-light"
          role="alert"
        >
          {fileError}
        </CaptionP>
      )}
      <OptionsRowSC>
        <WorkbenchPromptOptionsGroup>
          <ChatInputIconFrame
            icon={<PaperclipIcon />}
            tooltip="Attach files"
            aria-label="Attach files"
            disabled={disabled}
            onClick={open}
          />
          {toolbar}
          {options.map((option) => {
            const name = option.name ?? option.configId
            const locked =
              (option.category === MODEL_CATEGORY && !modelSwitchable) ||
              !onSetConfigOption ||
              disabled
            const select = (value: string) =>
              onSetConfigOption?.(option.configId, value)
            if (isAutonomyOption(option))
              return (
                <AutonomyPillSelect
                  key={option.configId}
                  levels={autonomyChoices(option, autonomyPolicy, proxyBilled)}
                  value={option.currentValue}
                  onSelect={select}
                  disabled={locked}
                />
              )
            const values =
              option.category === MODEL_CATEGORY && proxyModels?.length
                ? proxyModelValues(option, proxyModels)
                : (option.options ?? []).filter(isNonNullable)
            const current = values.find((o) => o.value === option.currentValue)
            return (
              <PillSelect
                key={option.configId}
                label={name}
                selectedKey={option.currentValue}
                onSelect={select}
                disabled={locked}
                trigger={
                  option.category === MODEL_CATEGORY ? (
                    <DevboxModelLabel
                      model={option.currentValue}
                      label={
                        proxyModelOf(option.currentValue)?.slug ??
                        current?.name ??
                        current?.value ??
                        name
                      }
                    />
                  ) : (
                    `${name}: ${current?.name ?? current?.value ?? '–'}`
                  )
                }
              >
                {values.map((o) => {
                  const proxy =
                    option.category === MODEL_CATEGORY
                      ? proxyModelOf(o.value)
                      : null
                  return (
                    <ListBoxItem
                      key={o.value}
                      label={proxy?.slug ?? o.name ?? o.value}
                      description={
                        proxy ? undefined : (o.description ?? undefined)
                      }
                      leftContent={
                        proxy ? (
                          <DevboxModelProviderIcon model={o.value} />
                        ) : undefined
                      }
                    />
                  )
                })}
              </PillSelect>
            )
          })}
        </WorkbenchPromptOptionsGroup>
      </OptionsRowSC>
      {running && onCancel ? (
        <Tooltip label="Stop the agent">
          <WorkbenchPromptCancelButton
            aria-label="Stop"
            onClick={onCancel}
          />
        </Tooltip>
      ) : (
        <WorkbenchPromptSubmitButton
          aria-label="Send"
          loading={sending}
          disabled={disabled || !canSubmit}
          onClick={submit}
        />
      )}
    </ComposerSC>
  )
}

const ComposerSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.input,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-zero']
      : theme.colors['fill-zero-selected'],
  transition: 'border 0.16s ease-in-out',
  '&:has([role="textbox"]:focus)': {
    border: theme.borders['outline-focused'],
  },
}))

const PromptSC = styled(EditableDiv)(({ theme }) => ({
  flex: 'none',
  minHeight: '4.5em',
  maxHeight: '40vh',
  padding: `${theme.spacing.xxsmall} ${theme.spacing.xsmall}`,
  color: theme.colors.text,
  [`[${SLASH_COMMAND_ATTR}]`]: {
    fontFamily: theme.fontFamilies.mono,
    color: theme.colors['text-primary-accent'],
    background: theme.colors['fill-two'],
    border: theme.borders['fill-two'],
    borderRadius: theme.borderRadiuses.medium,
    padding: `0 ${theme.spacing.xsmall}`,
    userSelect: 'none',
  },
}))

// leaves room for the absolutely positioned send button
const OptionsRowSC = styled.div(({ theme }) => ({
  paddingRight: theme.spacing.xlarge,
}))
