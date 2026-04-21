import {
  Button,
  Card,
  EmptyState,
  Flex,
  FormField,
  IconFrame,
  Input2,
  PencilIcon,
  ReturnIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import styled from 'styled-components'

import { EditableDiv } from 'components/utils/EditableDiv'
import { StackedText } from 'components/utils/table/StackedText'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { WorkbenchSkillAttributes } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

import {
  createFormUpdater,
  EditableDivWrapperSC,
  WorkbenchFormStepProps,
} from './WorkbenchFormSteps'

export function PluralSkillsSubStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const update = createFormUpdater(setFormState)
  const skills: WorkbenchSkillAttributes[] = (
    formState.workbenchSkills ?? []
  ).filter(isNonNullable)
  const [editingName, setEditingName] = useState<string | 'new' | null>(null)

  const editingSkill = useMemo(() => {
    if (editingName === null || editingName === 'new') return null
    return skills.find((s) => s.name === editingName) ?? null
  }, [editingName, skills])

  const handleCreate = () => setEditingName('new')
  const handleEdit = (name: string) => setEditingName(name)
  const handleDelete = (name: string) =>
    update((d) => {
      const next: WorkbenchSkillAttributes[] = (d.workbenchSkills ?? [])
        .filter(isNonNullable)
        .filter((s) => s.name !== name)
      d.workbenchSkills =
        next as WorkbenchFormStepProps['formState']['workbenchSkills']
    })

  const handleSave = (draft: WorkbenchSkillAttributes) => {
    update((d) => {
      const list: WorkbenchSkillAttributes[] = (d.workbenchSkills ?? []).filter(
        isNonNullable
      )
      const idx =
        editingName && editingName !== 'new'
          ? list.findIndex((s) => s.name === editingName)
          : -1
      if (idx >= 0) list[idx] = draft
      else list.push(draft)
      d.workbenchSkills =
        list as WorkbenchFormStepProps['formState']['workbenchSkills']
    })
    setEditingName(null)
  }

  if (editingName !== null) {
    return (
      <PluralSkillForm
        initialSkill={editingSkill}
        isNew={editingName === 'new'}
        onSave={handleSave}
        onCancel={() => setEditingName(null)}
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
        <Flex
          direction="column"
          gap="xsmall"
        >
          {skills.map((skill) => (
            <PluralSkillRow
              key={skill.name}
              skill={skill}
              onEdit={() => handleEdit(skill.name)}
              onDelete={() => handleDelete(skill.name)}
            />
          ))}
        </Flex>
      )}
    </FormField>
  )
}

function PluralSkillRow({
  skill,
  onEdit,
  onDelete,
}: {
  skill: WorkbenchSkillAttributes
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <PluralSkillRowSC>
      <StackedText
        truncate
        first={skill.name || 'Untitled skill'}
        second={skill.description || undefined}
        firstPartialType="body2Bold"
        firstColor="text"
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
    </PluralSkillRowSC>
  )
}

function PluralSkillForm({
  initialSkill,
  isNew,
  onSave,
  onCancel,
}: {
  initialSkill: Nullable<WorkbenchSkillAttributes>
  isNew: boolean
  onSave: (skill: WorkbenchSkillAttributes) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<WorkbenchSkillAttributes>(() =>
    initialSkill ? { ...initialSkill } : createEmptyPluralSkill()
  )

  const canSave = !!draft.contents.trim() && !!draft.name.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
    })
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <FormField
        required
        label="Name"
      >
        <Input2
          placeholder="e.g. skill_math"
          value={draft.name}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, name: e.target.value }))
          }
        />
      </FormField>
      <FormField label="Description">
        <Input2
          placeholder="Short summary of what this skill does"
          value={draft.description ?? ''}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              description: e.target.value || null,
            }))
          }
        />
      </FormField>
      <FormField
        required
        label="Skills file"
        infoTooltip="Markdown contents of the skill file."
      >
        <EditableDivWrapperSC>
          <EditableDiv
            initialValue={draft.contents}
            setValue={(value) =>
              setDraft((prev) => ({ ...prev, contents: value }))
            }
            placeholder="Paste or write the markdown contents of the skill file."
            css={{ minHeight: 200 }}
          />
        </EditableDivWrapperSC>
      </FormField>
      <Flex
        justify="flex-end"
        gap="small"
      >
        <Button
          secondary
          startIcon={<ReturnIcon />}
          onClick={onCancel}
        >
          Back to all skills
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave}
        >
          {isNew ? 'Create new skill' : 'Save skill'}
        </Button>
      </Flex>
    </Flex>
  )
}

const PluralSkillRowSC = styled(Card).attrs({ fillLevel: 2 })(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  border: theme.borders['fill-two'],
}))

function createEmptyPluralSkill(): WorkbenchSkillAttributes {
  return {
    name: '',
    description: null,
    contents: '',
  }
}
