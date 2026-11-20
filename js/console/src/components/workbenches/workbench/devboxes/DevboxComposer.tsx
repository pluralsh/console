import {
  Button,
  Flex,
  IconFrame,
  ListBoxItem,
  PaperclipIcon,
  Select,
  SendMessageIcon,
  StopIcon,
} from '@pluralsh/design-system'
import {
  AttachmentShelf,
  DropOverlay,
  mergeAttachments,
  usePendingAttachmentItems,
} from 'components/ai/chatbot/input/ChatAttachments'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxCommandFragment,
  DevboxConfigOptionFragment,
} from 'generated/graphql'
import {
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useDropzone } from 'react-dropzone'
import styled from 'styled-components'
import { formatFileSize } from 'utils/file'
import { isNonNullable } from 'utils/isNonNullable'
import {
  applySlashCommand,
  getSlashQuery,
  groupSlashCommands,
  matchSlashCommands,
  slashCommandHint,
} from './devboxSlashCommands'
import { autonomyChoices, isAutonomyOption } from './devboxAutonomy'
import { MODEL_CATEGORY } from './devboxStartForm'

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
  modelSwitchable = true,
  running = false,
  disabled = false,
  placeholder = 'Message the agent, or / for commands',
  onSubmit,
  onCancel,
  onSetConfigOption,
}: {
  commands: Nullable<Nullable<DevboxCommandFragment>[]>
  configOptions?: Nullable<Nullable<DevboxConfigOptionFragment>[]>
  modelSwitchable?: boolean
  running?: boolean
  disabled?: boolean
  placeholder?: string
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
  const groups = slash
    ? groupSlashCommands(
        matchSlashCommands(commands, slash.query).slice(0, MAX_SUGGESTIONS)
      )
    : []
  const flat = groups.flatMap((g) => g.items)
  const slashOpen = !!slash && flat.length > 0 && dismissed !== text
  const hint = slashCommandHint(text, commands)

  const update = (value: string, pos?: number) => {
    setText(value)
    setCaret(pos ?? value.length)
    setActive(0)
  }

  const pick = (cmd: DevboxCommandFragment) => {
    const next = applySlashCommand(text, cmd)
    const pos = cmd.name.length + 2
    update(next, pos)
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(pos, pos)
    })
  }

  const canSubmit =
    (!!text.trim() || files.length > 0) && !fileError && !sending
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
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => (i + 1) % flat.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (i - 1 + flat.length) % flat.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const cmd = flat[Math.min(active, flat.length - 1)]
        if (cmd) pick(cmd)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setDismissed(text)
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
    .sort((a, b) => Number(isAutonomyOption(b)) - Number(isAutonomyOption(a)))

  return (
    <ComposerSC {...getRootProps()}>
      <input
        {...getInputProps()}
        aria-label="Attach files"
      />
      {isDragActive && <DropOverlay />}
      <AttachmentShelf items={fileItems} />
      {slashOpen && (
        <SuggestionsSC
          role="listbox"
          aria-label="Slash commands"
        >
          {groups.map((group) => (
            <div key={group.label}>
              <GroupLabelSC>{group.label}</GroupLabelSC>
              {group.items.map((cmd) => {
                const idx = flat.indexOf(cmd)
                return (
                  <SuggestionSC
                    key={cmd.name}
                    role="option"
                    aria-selected={idx === active}
                    $active={idx === active}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pick(cmd)
                    }}
                    onMouseEnter={() => setActive(idx)}
                  >
                    <code>/{cmd.name}</code>
                    {cmd.description && (
                      <CaptionP $color="text-xlight">
                        {cmd.description}
                      </CaptionP>
                    )}
                  </SuggestionSC>
                )
              })}
            </div>
          ))}
        </SuggestionsSC>
      )}
      <TextareaSC
        ref={ref}
        aria-label="Prompt"
        rows={3}
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
      <Flex
        justify="space-between"
        align="center"
        gap="small"
      >
        <Flex
          gap="small"
          align="center"
          wrap="wrap"
        >
          <IconFrame
            clickable
            size="small"
            icon={<PaperclipIcon />}
            tooltip="Attach files"
            aria-label="Attach files"
            disabled={disabled}
            onClick={open}
          />
          {options.map((option) => {
            const fixed = option.category === MODEL_CATEGORY && !modelSwitchable
            return (
              <ConfigSelectSC key={option.configId}>
                <Select
                  size="small"
                  label={option.name ?? option.configId}
                  isDisabled={fixed || !onSetConfigOption || disabled}
                  selectedKey={option.currentValue ?? null}
                  onSelectionChange={(key) =>
                    onSetConfigOption?.(option.configId, `${key}`)
                  }
                >
                  {isAutonomyOption(option)
                    ? autonomyChoices(option).map((c) => (
                        <ListBoxItem
                          key={c.value}
                          label={c.label}
                          disabled={!!c.unavailable}
                          description={
                            !c.unavailable
                              ? c.description
                              : c.value === 'auto'
                                ? c.unavailable
                                : 'Not available for this agent on this box'
                          }
                        />
                      ))
                    : (option.options ?? []).filter(isNonNullable).map((o) => (
                        <ListBoxItem
                          key={o.value}
                          label={o.name ?? o.value}
                          description={o.description ?? undefined}
                        />
                      ))}
                </Select>
              </ConfigSelectSC>
            )
          })}
        </Flex>
        {running && onCancel ? (
          <Button
            small
            secondary
            startIcon={<StopIcon />}
            onClick={onCancel}
          >
            Stop
          </Button>
        ) : (
          <Button
            small
            startIcon={<SendMessageIcon />}
            disabled={disabled || !canSubmit}
            onClick={submit}
          >
            Send
          </Button>
        )}
      </Flex>
    </ComposerSC>
  )
}

const ComposerSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-one'],
}))

const TextareaSC = styled.textarea(({ theme }) => ({
  ...theme.partials.text.body2,
  resize: 'none',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: theme.colors.text,
  '&::placeholder': { color: theme.colors['text-xlight'] },
}))

const SuggestionsSC = styled.div(({ theme }) => ({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 'calc(100% + 4px)',
  maxHeight: 320,
  overflowY: 'auto',
  zIndex: theme.zIndexes.selectPopover,
  padding: `${theme.spacing.xsmall}px 0`,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders['fill-two'],
  backgroundColor: theme.colors['fill-two'],
  boxShadow: theme.boxShadows.moderate,
}))

const GroupLabelSC = styled.div(({ theme }) => ({
  ...theme.partials.text.overline,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  color: theme.colors['text-xlight'],
}))

const SuggestionSC = styled.div<{ $active: boolean }>(({ theme, $active }) => ({
  display: 'flex',
  alignItems: 'baseline',
  gap: theme.spacing.small,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  cursor: 'pointer',
  backgroundColor: $active ? theme.colors['fill-two-hover'] : 'transparent',
  code: { ...theme.partials.text.code, color: theme.colors.text },
}))

const ConfigSelectSC = styled.div({ minWidth: 160 })
