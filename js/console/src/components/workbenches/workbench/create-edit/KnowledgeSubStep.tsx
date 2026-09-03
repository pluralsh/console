import {
  Button,
  Card,
  Chip,
  CodeEditor,
  EmptyState,
  Flex,
  FormField,
  IconFrame,
  Input2,
  PencilIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

import { StackedText } from 'components/utils/table/StackedText'
import { CaptionP } from 'components/utils/typography/Text'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

import { createFormUpdater, WorkbenchFormStepProps } from './WorkbenchFormSteps'
import {
  useWorkbenchFormCardRightContent,
  useWorkbenchFormFooterActions,
  WorkbenchFormKnowledge,
} from './WorkbenchCreateOrEdit'

type KnowledgeFormStep = 'metadata' | 'contents'
const KNOWLEDGE_FORM_STEPS: { id: KnowledgeFormStep; label: string }[] = [
  { id: 'metadata', label: 'Add metadata' },
  { id: 'contents', label: 'Add content' },
]
const DUPLICATE_KNOWLEDGE_NAME_ERROR =
  'A knowledge entry with this name already exists.'

const normalizeKnowledgeName = (name: Nullable<string>) =>
  (name ?? '').trim().toLowerCase()

const validateKnowledgeName = ({
  draftName,
  existingNames,
  editingName,
}: {
  draftName: Nullable<string>
  existingNames: Nullable<string>[]
  editingName: Nullable<string>
}): Nullable<string> => {
  const normalizedDraftName = normalizeKnowledgeName(draftName)
  if (!normalizedDraftName) return null

  const normalizedEditingName = normalizeKnowledgeName(editingName)
  const hasDuplicateName = existingNames.some((name) => {
    const normalizedExistingName = normalizeKnowledgeName(name)
    return (
      normalizedExistingName === normalizedDraftName &&
      normalizedExistingName !== normalizedEditingName
    )
  })

  return hasDuplicateName ? DUPLICATE_KNOWLEDGE_NAME_ERROR : null
}

const knowledgeUsageLabel = (entry: WorkbenchFormKnowledge) => {
  const usages = entry.usages ?? 0
  const usageText = `${usages} use${usages === 1 ? '' : 's'}`
  const lastUsed = entry.lastUsedAt
    ? `last used ${fromNow(entry.lastUsedAt)}`
    : 'never used'
  return [entry.description, `${usageText} · ${lastUsed}`]
    .filter(Boolean)
    .join(' · ')
}

export function KnowledgeSubStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const theme = useTheme()
  const update = createFormUpdater(setFormState)
  const entries = formState.workbenchKnowledge
  const existingNames = useMemo(
    () => entries.map((entry) => entry.name),
    [entries]
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingEntry = useMemo(
    () =>
      !editingId
        ? null
        : (entries.find((entry) => entry.id === editingId) ?? null),
    [editingId, entries]
  )

  const handleEdit = (id: string) => setEditingId(id)

  const handleDelete = (id: string) =>
    update((d) => {
      d.workbenchKnowledge = (d.workbenchKnowledge ?? []).filter(
        (entry) => entry.id !== id
      )
    })

  const handleSave = (draft: WorkbenchFormKnowledge): Nullable<string> => {
    const canSave = !!draft.knowledge.trim() && !!draft.name.trim()
    if (!canSave) return 'Knowledge name and contents are required.'

    const error = validateKnowledgeName({
      draftName: draft.name,
      existingNames,
      editingName: editingEntry?.name,
    })
    if (error) return error

    const normalizedDraft: WorkbenchFormKnowledge = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
      knowledge: draft.knowledge,
      labels: draft.labels
        .filter(isNonNullable)
        .map((label) => label.trim())
        .filter(Boolean),
    }
    update((d) => {
      const list = [...(d.workbenchKnowledge ?? [])]
      const idx = list.findIndex((entry) => entry.id === draft.id)
      if (idx >= 0) list[idx] = normalizedDraft
      d.workbenchKnowledge = list
    })
    setEditingId(null)
    return null
  }

  const handleCancel = () => setEditingId(null)

  if (editingId !== null && editingEntry) {
    return (
      <KnowledgeForm
        initialEntry={editingEntry}
        existingNames={existingNames}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <CaptionP $color="text-light">
        Plural maintains a knowledge base automatically across multiple runs of
        this workbench. Entries can go stale; edit or delete them to keep facts
        accurate and make room for new ones.
      </CaptionP>
      <FormField label="Knowledge">
        {entries.length === 0 ? (
          <Card css={{ border: 'none' }}>
            <EmptyState
              message="No knowledge yet"
              description="Facts discovered in previous runs will appear here. Use them for system understanding, and remove entries that are stale or unused."
              css={{ margin: '0 auto', width: 580 }}
            />
          </Card>
        ) : (
          <Card
            fillLevel={2}
            css={{
              padding: 0,
              overflow: 'hidden',
              border: theme.borders['fill-two'],
              backgroundColor: theme.colors['fill-zero'],
            }}
          >
            {entries.map((entry, idx) => (
              <KnowledgeRow
                key={entry.id}
                entry={entry}
                isLast={idx === entries.length - 1}
                onEdit={() => handleEdit(entry.id)}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </Card>
        )}
      </FormField>
    </Flex>
  )
}

function KnowledgeRow({
  entry,
  isLast,
  onEdit,
  onDelete,
}: {
  entry: WorkbenchFormKnowledge
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const theme = useTheme()
  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.small,
        padding: theme.spacing.small,
        borderBottom: isLast ? 'none' : theme.borders['fill-two'],
      }}
    >
      <StackedText
        truncate
        first={entry.name}
        second={knowledgeUsageLabel(entry)}
        firstPartialType="body2LooseLineHeight"
        firstColor="text-light"
        secondPartialType="caption"
        secondColor="text-xlight"
        css={{ minWidth: 0, flex: 1 }}
      />
      <Flex
        align="center"
        gap="xsmall"
      >
        <IconFrame
          clickable
          tooltip="Edit knowledge"
          icon={<PencilIcon />}
          onClick={onEdit}
        />
        <IconFrame
          clickable
          tooltip="Delete knowledge"
          icon={<TrashCanIcon color="icon-danger" />}
          onClick={onDelete}
        />
      </Flex>
    </div>
  )
}

function KnowledgeForm({
  initialEntry,
  existingNames,
  onSave,
  onCancel,
}: {
  initialEntry: WorkbenchFormKnowledge
  existingNames: Nullable<string>[]
  onSave: (entry: WorkbenchFormKnowledge) => Nullable<string>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<WorkbenchFormKnowledge>(initialEntry)
  const [labelDraft, setLabelDraft] = useState('')
  const [saveError, setSaveError] = useState<Nullable<string>>(null)
  const [currentStep, setCurrentStep] = useState<KnowledgeFormStep>('metadata')
  const { setFooterActions } = useWorkbenchFormFooterActions()
  const { setRightContent } = useWorkbenchFormCardRightContent()
  const validationError = useMemo(
    () =>
      validateKnowledgeName({
        draftName: draft.name,
        existingNames,
        editingName: initialEntry.name,
      }),
    [draft.name, existingNames, initialEntry.name]
  )
  const canContinue = !!draft.name.trim() && !validationError
  const canSave = canContinue && !!draft.knowledge.trim()
  const updateDraft = (next: WorkbenchFormKnowledge) => {
    setSaveError(null)
    setDraft(next)
  }

  const onSaveRef = useRef(onSave)
  const onCancelRef = useRef(onCancel)
  const draftRef = useRef(draft)
  useEffect(() => {
    onSaveRef.current = onSave
    onCancelRef.current = onCancel
    draftRef.current = draft
  }, [draft, onCancel, onSave])

  useEffect(() => {
    setFooterActions(
      <>
        <Button
          destructive
          onClick={() => onCancelRef.current()}
        >
          Cancel
        </Button>
        {currentStep === 'metadata' ? (
          <Button
            onClick={() => setCurrentStep('contents')}
            disabled={!canContinue}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={() => {
              const nextError = onSaveRef.current(draftRef.current)
              setSaveError(nextError)
            }}
            disabled={!canSave}
          >
            Save knowledge
          </Button>
        )}
      </>
    )

    return () => setFooterActions(null)
  }, [canContinue, canSave, currentStep, setFooterActions])

  useEffect(() => {
    setRightContent(
      <KnowledgeFormSteps
        activeStep={currentStep}
        canGoToContent={canContinue}
        onStepSelect={setCurrentStep}
      />
    )

    return () => setRightContent(null)
  }, [canContinue, currentStep, setRightContent])

  const addLabel = (raw: string) => {
    const label = raw.trim()
    if (!label) return
    if (
      draft.labels.some(
        (existing) => existing.toLowerCase() === label.toLowerCase()
      )
    ) {
      setLabelDraft('')
      return
    }
    updateDraft({ ...draft, labels: [...draft.labels, label] })
    setLabelDraft('')
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {currentStep === 'metadata' ? (
        <>
          <FormField
            required
            error={!!validationError}
            label="Knowledge name"
            hint={validationError}
          >
            <Input2
              placeholder="Knowledge name"
              value={draft.name}
              error={!!validationError}
              onChange={(e) => updateDraft({ ...draft, name: e.target.value })}
            />
          </FormField>
          <FormField label="Knowledge description">
            <Input2
              placeholder="Short summary of this fact"
              value={draft.description ?? ''}
              onChange={(e) =>
                updateDraft({ ...draft, description: e.target.value || null })
              }
            />
          </FormField>
          <FormField
            label="Labels"
            hint="Keep related facts thematically aligned. Press Enter to add a label."
          >
            <Flex
              direction="column"
              gap="xsmall"
            >
              <Input2
                placeholder="Add a label"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  addLabel(labelDraft)
                }}
              />
              {draft.labels.length > 0 && (
                <Flex
                  gap="xsmall"
                  wrap="wrap"
                >
                  {draft.labels.map((label) => (
                    <Chip
                      key={label}
                      size="small"
                      closeButton
                      clickable
                      onClick={() =>
                        updateDraft({
                          ...draft,
                          labels: draft.labels.filter(
                            (current) => current !== label
                          ),
                        })
                      }
                    >
                      {label}
                    </Chip>
                  ))}
                </Flex>
              )}
            </Flex>
          </FormField>
        </>
      ) : (
        <FormField
          required
          label="Knowledge"
          infoTooltip="Markdown contents of this knowledge entry."
        >
          <CodeEditor
            language="markdown"
            value={draft.knowledge}
            onChange={(value) =>
              updateDraft({ ...draft, knowledge: value ?? '' })
            }
            height={350}
            options={{ minimap: { enabled: false } }}
          />
        </FormField>
      )}
      {!!saveError && <CaptionP $color="text-danger">{saveError}</CaptionP>}
    </Flex>
  )
}

function KnowledgeFormSteps({
  activeStep,
  canGoToContent,
  onStepSelect,
}: {
  activeStep: KnowledgeFormStep
  canGoToContent: boolean
  onStepSelect: (step: KnowledgeFormStep) => void
}) {
  const theme = useTheme()

  return (
    <Flex
      direction="column"
      gap="xsmall"
      align="flex-start"
      css={{ minWidth: 140 }}
    >
      {KNOWLEDGE_FORM_STEPS.map(({ id, label }, idx) => {
        const isActive = id === activeStep
        const isClickable = id === 'metadata' || canGoToContent

        return (
          <button
            key={id}
            type="button"
            onClick={() => isClickable && onStepSelect(id)}
            css={{
              ...theme.partials.text.body2,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xsmall,
              border: 'none',
              background: 'transparent',
              color: isActive
                ? theme.colors['text']
                : theme.colors['text-xlight'],
              cursor: isClickable ? 'pointer' : 'not-allowed',
              opacity: isClickable ? 1 : 0.6,
              padding: 0,
            }}
          >
            <Flex
              align="center"
              justify="center"
              css={{
                ...theme.partials.text.overline,
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: theme.colors['fill-one'],
                border: theme.borders.default,
                color: isActive
                  ? theme.colors['text']
                  : theme.colors['text-xlight'],
              }}
            >
              {idx + 1}
            </Flex>
            <span>{label}</span>
          </button>
        )
      })}
    </Flex>
  )
}
