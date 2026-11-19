import {
  FileIcon,
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
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxCommandFragment,
  DevboxConfigOptionFragment,
} from 'generated/graphql'
import {
  ClipboardEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
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
  autonomyChoices,
  DevboxAutonomyPolicy,
  isAutonomyOption,
} from './devboxAutonomy'
import {
  applyFileMention,
  getMentionQuery,
  matchFiles,
  useDevboxDirectory,
} from './devboxFileMentions'
import { AutonomyPillSelect, PillSelect } from './DevboxPromptPills'
import {
  applySlashCommand,
  getSlashQuery,
  groupSlashCommands,
  matchSlashCommands,
  slashCommandHint,
} from './devboxSlashCommands'
import { MODEL_CATEGORY } from './devboxStartForm'
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

export function DevboxComposer({
  commands,
  configOptions,
  autonomyPolicy,
  proxyBilled = false,
  modelSwitchable = true,
  listFiles,
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
  // completes `@path` mentions against the instance's files
  listFiles?: Nullable<(path: string) => Promise<DevboxFileEntry[]>>
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
  const ref = useRef<HTMLTextAreaElement>(null)
  const draft = useRef({ text, files })
  useEffect(() => {
    draft.current = { text, files }
  }, [text, files])

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

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = Array.from(e.clipboardData?.files ?? [])
    if (pasted.length === 0) return
    e.preventDefault()
    addFiles(pasted)
  }

  const slash = getSlashQuery(text, caret)
  const commandMatches = slash
    ? groupSlashCommands(
        matchSlashCommands(commands, slash.query).slice(0, MAX_SUGGESTIONS)
      ).flatMap((g) => g.items.map((cmd) => ({ cmd, group: g.label })))
    : []
  const mention = !slash && listFiles ? getMentionQuery(text, caret) : null
  const directory = useDevboxDirectory(listFiles, mention?.dir)
  const fileMatches = mention
    ? matchFiles(directory.entries, mention.leaf).slice(0, MAX_SUGGESTIONS)
    : []

  const suggestions: DevboxSuggestion[] = slash
    ? commandMatches.map(({ cmd, group }) => ({
        key: cmd.name,
        title: `/${cmd.name}`,
        subtitle: cmd.description,
        group,
        mono: true,
      }))
    : fileMatches.map((entry) => ({
        key: entry.path,
        title: isDirectory(entry) ? `${entry.name}/` : entry.name,
        subtitle: entry.path,
        icon: isDirectory(entry) ? (
          <FolderIcon size={14} />
        ) : (
          <FileIcon size={14} />
        ),
        kind: entry.gitStatus ?? undefined,
      }))
  const menuOpen =
    dismissed !== text &&
    (slash ? suggestions.length > 0 : !!mention && !disabled)
  const hint = slashCommandHint(text, commands)

  const update = (value: string, pos?: number) => {
    setText(value)
    setCaret(pos ?? value.length)
    setActive(0)
  }

  const moveCaret = (value: string, pos: number) => {
    update(value, pos)
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(pos, pos)
    })
  }

  const pick = (idx: number) => {
    if (slash) {
      const cmd = commandMatches[idx]?.cmd
      if (cmd) moveCaret(applySlashCommand(text, cmd), cmd.name.length + 2)
      return
    }
    const entry = fileMatches[idx]
    if (!entry || !mention) return
    const next = applyFileMention(text, mention, entry)
    moveCaret(next.text, next.caret)
  }

  const canSubmit =
    (allowEmpty || !!text.trim() || files.length > 0) && !fileError && !sending
  const submit = () => {
    if (!canSubmit || disabled) return
    const sent = { text, files }
    // only clear what was sent; the user may have kept typing while it was in flight
    const clear = (ok: void | boolean) => {
      if (ok === false) return
      if (draft.current.text === sent.text) update('')
      if (draft.current.files === sent.files) setFiles(NO_FILES)
    }
    const result = onSubmit(text.trim(), files)
    if (!(result instanceof Promise)) return clear(result)
    setSending(true)
    result.then(clear, () => undefined).finally(() => setSending(false))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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

  const options = (configOptions ?? [])
    .filter(isNonNullable)
    .filter((o) => o.options?.length)
    .sort((a, b) => Number(isAutonomyOption(a)) - Number(isAutonomyOption(b)))

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
          loading={directory.loading}
          empty={directory.error ? "Couldn't list this directory" : undefined}
          onPick={pick}
          onHover={setActive}
        />
      )}
      <TextareaSC
        ref={ref}
        aria-label="Prompt"
        rows={3}
        autoFocus={autoFocus}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) =>
          update(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
        }
        onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
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
            const values = (option.options ?? []).filter(isNonNullable)
            const current = values.find((o) => o.value === option.currentValue)
            return (
              <PillSelect
                key={option.configId}
                label={name}
                selectedKey={option.currentValue}
                onSelect={select}
                disabled={locked}
                trigger={
                  option.category === MODEL_CATEGORY
                    ? (current?.name ?? current?.value ?? name)
                    : `${name}: ${current?.name ?? current?.value ?? '–'}`
                }
              >
                {values.map((o) => (
                  <ListBoxItem
                    key={o.value}
                    label={o.name ?? o.value}
                    description={o.description ?? undefined}
                  />
                ))}
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
  '&:has(textarea:focus)': { border: theme.borders['outline-focused'] },
}))

const TextareaSC = styled.textarea(({ theme }) => ({
  ...theme.partials.text.body2,
  resize: 'none',
  border: 'none',
  outline: 'none',
  padding: `${theme.spacing.xxsmall} ${theme.spacing.xsmall}`,
  background: 'transparent',
  color: theme.colors.text,
  '&::placeholder': { color: theme.colors['text-xlight'] },
}))

// leaves room for the absolutely positioned send button
const OptionsRowSC = styled.div(({ theme }) => ({
  paddingRight: theme.spacing.xlarge,
}))
