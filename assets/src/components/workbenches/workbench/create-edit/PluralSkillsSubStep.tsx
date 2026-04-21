import {
  Button,
  Card,
  EmptyState,
  Flex,
  CodeEditor,
  FormField,
  IconFrame,
  Input2,
  PencilIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

import { StackedText } from 'components/utils/table/StackedText'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { CaptionP } from 'components/utils/typography/Text'
import { WorkbenchSkillAttributes } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

import { createFormUpdater, WorkbenchFormStepProps } from './WorkbenchFormSteps'
import {
  useWorkbenchFormCardRightContent,
  useWorkbenchFormFooterActions,
} from './WorkbenchCreateOrEdit'

export const CREATE_MODE_NAME = ''

type SkillFormStep = 'metadata' | 'contents'
const SKILL_FORM_STEPS: { id: SkillFormStep; label: string }[] = [
  { id: 'metadata', label: 'Add metadata' },
  { id: 'contents', label: 'Add content' },
]
const DUPLICATE_SKILL_NAME_ERROR = 'A skill with this name already exists.'

const normalizeSkillName = (name: Nullable<string>) =>
  (name ?? '').trim().toLowerCase()

const validateSkillName = ({
  draftName,
  existingSkillNames,
  editingName,
}: {
  draftName: Nullable<string>
  existingSkillNames: Nullable<string>[]
  editingName: Nullable<string>
}): Nullable<string> => {
  const normalizedDraftName = normalizeSkillName(draftName)
  if (!normalizedDraftName) return null

  const normalizedEditingName = normalizeSkillName(editingName)
  const hasDuplicateName = existingSkillNames.some((name) => {
    const normalizedExistingName = normalizeSkillName(name)
    return (
      normalizedExistingName === normalizedDraftName &&
      normalizedExistingName !== normalizedEditingName
    )
  })

  return hasDuplicateName ? DUPLICATE_SKILL_NAME_ERROR : null
}

export function PluralSkillsSubStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const theme = useTheme()
  const update = createFormUpdater(setFormState)
  const skills: WorkbenchSkillAttributes[] = (
    formState.workbenchSkills ?? []
  ).filter(isNonNullable)
  const existingSkillNames = useMemo(
    () => skills.map((skill) => skill.name),
    [skills]
  )
  const [editingName, setEditingName] = useState<string | null>(null)

  const editingSkill = useMemo(
    () =>
      !editingName
        ? null
        : (skills.find((s) => s.name === editingName) ?? null),
    [editingName, skills]
  )

  const handleCreate = () => setEditingName(CREATE_MODE_NAME)

  const handleEdit = (name: string) => setEditingName(name)

  const handleDelete = (name: string) =>
    update((d) => {
      const next: WorkbenchSkillAttributes[] = (d.workbenchSkills ?? [])
        .filter(isNonNullable)
        .filter((s) => s.name !== name)
      d.workbenchSkills =
        next as WorkbenchFormStepProps['formState']['workbenchSkills']
    })

  const handleSave = (draft: WorkbenchSkillAttributes): Nullable<string> => {
    const canSave = !!draft.contents.trim() && !!draft.name.trim()
    if (!canSave) return 'Skill name and contents are required.'

    const error = validateSkillName({
      draftName: draft.name,
      existingSkillNames,
      editingName,
    })
    if (error) return error

    const normalizedDraft: WorkbenchSkillAttributes = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description?.trim(),
    }
    update((d) => {
      const list: WorkbenchSkillAttributes[] = (d.workbenchSkills ?? []).filter(
        isNonNullable
      )
      const idx = editingName
        ? list.findIndex((s) => s.name === editingName)
        : -1
      if (idx >= 0) list[idx] = normalizedDraft
      else list.push(normalizedDraft)
      d.workbenchSkills =
        list as WorkbenchFormStepProps['formState']['workbenchSkills']
    })
    setEditingName(null)
    return null
  }

  const handleCancel = () => setEditingName(null)

  if (editingName !== null) {
    return (
      <PluralSkillForm
        initialSkill={editingSkill}
        existingSkillNames={existingSkillNames}
        isNew={editingName === CREATE_MODE_NAME}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <FormField
      label={
        <Flex
          align="center"
          justify="space-between"
          width="100%"
        >
          <span>Skills</span>
          {skills.length > 0 && (
            <InlineLink
              css={{ fontWeight: 400 }}
              onClick={(e) => {
                e.preventDefault()
                handleCreate()
              }}
            >
              Add new skills
            </InlineLink>
          )}
        </Flex>
      }
    >
      {skills.length === 0 ? (
        <Card css={{ border: 'none' }}>
          <EmptyState
            message="No skills"
            description="Skills teach Workbench agents what to do and how to do it. Add your first skill to get started, or connect a git repository to manage skills alongside your codebase."
            css={{ margin: '0 auto', width: 580 }}
          >
            <Button
              secondary
              small
              onClick={handleCreate}
            >
              Create new skill
            </Button>
          </EmptyState>
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
          {skills.map((skill, idx) => (
            <PluralSkillRow
              key={skill.name}
              skill={skill}
              isLast={idx === skills.length - 1}
              onEdit={() => handleEdit(skill.name)}
              onDelete={() => handleDelete(skill.name)}
            />
          ))}
        </Card>
      )}
    </FormField>
  )
}

function PluralSkillRow({
  skill,
  isLast,
  onEdit,
  onDelete,
}: {
  skill: WorkbenchSkillAttributes
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
        first={skill.name}
        second={skill.description}
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
          tooltip="Edit skill"
          icon={<PencilIcon />}
          onClick={onEdit}
        />
        <IconFrame
          clickable
          tooltip="Delete skill"
          icon={<TrashCanIcon color="icon-danger" />}
          onClick={onDelete}
        />
      </Flex>
    </div>
  )
}

function PluralSkillForm({
  initialSkill,
  existingSkillNames,
  isNew,
  onSave,
  onCancel,
}: {
  initialSkill: Nullable<WorkbenchSkillAttributes>
  existingSkillNames: Nullable<string>[]
  isNew: boolean
  onSave: (skill: WorkbenchSkillAttributes) => Nullable<string>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<WorkbenchSkillAttributes>(
    () =>
      initialSkill ?? {
        name: '',
        description: null,
        contents: '',
      }
  )
  const [saveError, setSaveError] = useState<Nullable<string>>(null)
  const [currentStep, setCurrentStep] = useState<SkillFormStep>('metadata')
  const { setFooterActions } = useWorkbenchFormFooterActions()
  const { setRightContent } = useWorkbenchFormCardRightContent()
  const validationError = useMemo(
    () =>
      validateSkillName({
        draftName: draft.name,
        existingSkillNames,
        editingName: initialSkill?.name,
      }),
    [draft.name, existingSkillNames, initialSkill?.name]
  )
  const canContinue = !!draft.name.trim() && !validationError
  const canSave = canContinue && !!draft.contents.trim()

  const onSaveRef = useRef(onSave)
  const onCancelRef = useRef(onCancel)
  const draftRef = useRef(draft)
  useEffect(() => {
    onSaveRef.current = onSave
    onCancelRef.current = onCancel
    draftRef.current = draft
  }, [draft, onCancel, onSave])

  useEffect(() => {
    setSaveError(null)
  }, [draft.contents, draft.description, draft.name])

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
              const saveError = onSaveRef.current(draftRef.current)
              setSaveError(saveError)
            }}
            disabled={!canSave}
          >
            {isNew ? 'Create new skill' : 'Save skill'}
          </Button>
        )}
      </>
    )

    return () => setFooterActions(null)
  }, [canContinue, canSave, currentStep, isNew, setFooterActions])

  useEffect(() => {
    setRightContent(
      <PluralSkillFormSteps
        activeStep={currentStep}
        canGoToContent={canContinue}
        onStepSelect={setCurrentStep}
      />
    )

    return () => setRightContent(null)
  }, [canContinue, currentStep, setRightContent])

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
            label="Skill name"
            hint={validationError}
          >
            <Input2
              placeholder="Skill name"
              value={draft.name}
              error={!!validationError}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </FormField>
          <FormField label="Skill description">
            <Input2
              placeholder="Short summary of what this skill does"
              value={draft.description ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  description: e.target.value || null,
                })
              }
            />
          </FormField>
        </>
      ) : (
        <FormField
          required
          label="Skills file"
          infoTooltip="Markdown contents of the skill file."
        >
          <CodeEditor
            language="markdown"
            value={draft.contents}
            onChange={(value) => setDraft({ ...draft, contents: value ?? '' })}
            height={350}
            options={{ minimap: { enabled: false } }}
          />
        </FormField>
      )}
      {!!saveError && <CaptionP $color="text-danger">{saveError}</CaptionP>}
    </Flex>
  )
}

function PluralSkillFormSteps({
  activeStep,
  canGoToContent,
  onStepSelect,
}: {
  activeStep: SkillFormStep
  canGoToContent: boolean
  onStepSelect: (step: SkillFormStep) => void
}) {
  const theme = useTheme()

  return (
    <Flex
      direction="column"
      gap="xsmall"
      align="flex-start"
      css={{ minWidth: 140 }}
    >
      {SKILL_FORM_STEPS.map(({ id, label }, idx) => {
        const isActive = id === activeStep
        const isClickable = id === 'metadata' || canGoToContent

        return (
          <button
            key={id}
            type="button"
            onClick={() => isClickable && onStepSelect(id)}
            css={{
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
              ...theme.partials.text.caption,
            }}
          >
            <Flex
              align="center"
              justify="center"
              css={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: theme.colors['fill-one'],
                border: theme.borders.default,
                color: isActive
                  ? theme.colors['text']
                  : theme.colors['text-xlight'],
                ...theme.partials.text.overline,
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
