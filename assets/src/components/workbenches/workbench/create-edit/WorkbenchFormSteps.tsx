import {
  ArrowTopRightIcon,
  Button,
  Card,
  Chip,
  CloseIcon,
  Divider,
  Flex,
  FormField,
  IconFrame,
  Input2,
  isValidRepoUrl,
  ListBoxItem,
  Radio,
  RadioGroup,
  Select,
  SelectButton,
  Switch,
} from '@pluralsh/design-system'
import {
  AgentRunMode,
  PolicyBindingFragment,
  useAgentRuntimeReposQuery,
  useGitRepositoriesQuery,
  useGitRepositoryQuery,
  useWorkbenchToolsQuery,
} from 'generated/graphql'
import { produce } from 'immer'
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react'
import styled from 'styled-components'

import { AIAgentRuntimesSelector } from 'components/ai/agent-runs/AIAgentRuntimesSelector'
import {
  RepositorySelector,
  ServiceGitFolderField,
  ServiceGitRefField,
} from 'components/cd/services/deployModal/DeployServiceSettingsGit'
import { FormBindings } from 'components/utils/bindings'
import { EditableDiv } from 'components/utils/EditableDiv'
import { OverlineH3 } from 'components/utils/typography/Text'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

import { EmptyStateCompact } from 'components/ai/AIThreads'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { InlineA } from 'components/utils/typography/Text'
import { Link } from 'react-router-dom'
import {
  WORKBENCHES_TOOLS_ABS_PATH,
  WORKBENCHES_TOOLS_ADD_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import { WorkbenchFormState } from './WorkbenchCreateOrEdit'
import {
  CardGrid,
  CardGridSkeleton,
} from '../../../self-service/catalog/CatalogsGrid'
import { GqlError } from '../../../utils/Alert'
import { StackedText } from '../../../utils/table/StackedText'
import {
  TOOL_TYPE_TO_LABEL,
  WorkbenchToolCardBody,
  WorkbenchToolIcon,
  workbenchToolCardGridStyles,
} from '../../tools/workbenchToolsUtils'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'

type FormStateSetter = Dispatch<SetStateAction<WorkbenchFormState>>
type WorkbenchFormStepProps = {
  formState: WorkbenchFormState
  setFormState: FormStateSetter
}

export function WorkbenchSetupStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const update = createFormUpdater(setFormState)
  const infra = formState.configuration?.infrastructure

  return (
    <>
      <FormField
        required
        label="Workbench name"
        caption="Name must be unique"
      >
        <Input2
          placeholder="Enter a name"
          value={formState.name}
          onChange={(e) =>
            update((d) => {
              d.name = e.target.value
            })
          }
        />
      </FormField>
      <FormField label="Workbench description">
        <Input2
          placeholder="Enter a description"
          value={formState.description ?? ''}
          onChange={(e) =>
            update((d) => {
              d.description = e.target.value || null
            })
          }
        />
      </FormField>

      <FormField label="System prompt">
        <EditableDivWrapperSC>
          <EditableDiv
            initialValue={formState.systemPrompt ?? ''}
            setValue={(value) =>
              update((d) => {
                d.systemPrompt = value || null
              })
            }
            placeholder="E.g. 'analyze unusual metrics and provide a solution'"
            css={{ minHeight: 80 }}
          />
        </EditableDivWrapperSC>
      </FormField>
      <FormField label="Enable plural native configuration">
        <Flex
          direction="column"
          gap="medium"
        >
          <Switch
            checked={infra?.stacks ?? false}
            onChange={(checked) =>
              update((d) => {
                d.configuration ??= {}
                d.configuration.infrastructure ??= {}
                d.configuration.infrastructure.stacks = checked
              })
            }
          >
            Stacks
          </Switch>
          <Switch
            checked={infra?.services ?? false}
            onChange={(checked) =>
              update((d) => {
                d.configuration ??= {}
                d.configuration.infrastructure ??= {}
                d.configuration.infrastructure.services = checked
              })
            }
          >
            Services
          </Switch>
          <Switch
            checked={infra?.kubernetes ?? false}
            onChange={(checked) =>
              update((d) => {
                d.configuration ??= {}
                d.configuration.infrastructure ??= {}
                d.configuration.infrastructure.kubernetes = checked
              })
            }
          >
            Kubernetes
          </Switch>
        </Flex>
      </FormField>
    </>
  )
}

export function WorkbenchSkillsConfigStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const update = createFormUpdater(setFormState)
  const { data: reposData, loading: reposLoading } = useGitRepositoriesQuery({
    variables: { first: 500 },
    fetchPolicy: 'cache-and-network',
  })
  const { data: repoData, loading: repoLoading } = useGitRepositoryQuery({
    variables: { id: formState.repositoryId ?? '' },
    skip: !formState.repositoryId,
  })
  const repos = useMemo(
    () => mapExistingNodes(reposData?.gitRepositories),
    [reposData]
  )
  const refs = repoData?.gitRepository?.refs ?? null
  const skillsRef = formState.skills?.ref
  const gitRef = skillsRef?.ref ?? ''
  const gitFolder = skillsRef?.folder ?? ''

  return (
    <>
      <FormField
        label="Repository"
        hint="Repo where skills files reside"
      >
        <RepositorySelector
          loading={reposLoading}
          repositories={repos}
          repositoryId={formState.repositoryId}
          setRepositoryId={(id) =>
            update((d) => {
              d.repositoryId = id || null
            })
          }
        />
      </FormField>
      {formState.repositoryId && (
        <>
          <ServiceGitRefField
            required
            loading={repoLoading}
            refs={refs?.filter(isNonNullable)}
            value={gitRef}
            setValue={(ref) =>
              update((d) => {
                d.skills ??= {}
                if (d.skills.ref) d.skills.ref.ref = ref
                else d.skills.ref = { ref, folder: '' }
              })
            }
          />
          <ServiceGitFolderField
            required
            value={gitFolder}
            label="Git folder"
            placeholder="e.g. workbenches/skills"
            hint="Folder within the source tree where skills files are located"
            onChange={(e) =>
              update((d) => {
                d.skills ??= {}
                if (d.skills.ref) d.skills.ref.folder = e.target.value
                else d.skills.ref = { ref: '', folder: e.target.value }
              })
            }
          />
          <FormField
            label="Skills file names"
            hint="Paste file names, using a newline per name.  Path is relative to the skills folder."
          >
            <EditableDivWrapperSC>
              <EditableDiv
                initialValue={skillsFilesToText(
                  formState.skills?.files ?? null
                )}
                setValue={(value) =>
                  update((d) => {
                    d.skills ??= {}
                    d.skills.files = textToSkillsFiles(value)
                  })
                }
                placeholder={`e.g:\nskill_math.md\nskill_science.md`}
                css={{ minHeight: 120 }}
              />
            </EditableDivWrapperSC>
          </FormField>
        </>
      )}
    </>
  )
}

export function WorkbenchCodingAgentStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const update = createFormUpdater(setFormState)
  const [repoInput, setRepoInput] = useState('')
  const [repoError, setRepoError] = useState<Nullable<string>>(null)

  const { data: runtimeReposData } = useAgentRuntimeReposQuery({
    variables: { id: formState.agentRuntimeId ?? '' },
    skip: !formState.agentRuntimeId,
  })
  const allowedRepos =
    runtimeReposData?.agentRuntime?.allowedRepositories?.filter(
      isNonNullable
    ) ?? null
  const coding = formState.configuration?.coding
  const repos = useMemo(
    () => coding?.repositories?.filter(isNonNullable) ?? [],
    [coding?.repositories]
  )
  const mode = coding?.mode ?? AgentRunMode.Analyze

  const setCodingRepos = (next: string[]) => {
    update((d) => {
      d.configuration ??= {}
      d.configuration.coding ??= {}
      d.configuration.coding.repositories = next
    })
  }

  const addRepo = () => {
    if (!repoInput.trim()) return
    if (!isValidRepoUrl(repoInput)) {
      setRepoError('Must be a valid git clone URL')
      return
    }
    if (allowedRepos && !allowedRepos.includes(repoInput)) {
      setRepoError('Repo must be from allowed list for this runtime')
      return
    }
    setRepoError(null)
    setCodingRepos([...repos, repoInput.trim()])
    setRepoInput('')
  }

  const removeRepo = (url: string) =>
    setCodingRepos(repos.filter((r) => r !== url))
  return (
    <>
      <FormField label="Select runtime">
        <FillLevelDiv fillLevel={2}>
          <AIAgentRuntimesSelector
            autoSelectDefault
            width={500}
            placeholder="Select runtime"
            selectedRuntimeId={formState.agentRuntimeId}
            setSelectedRuntimeId={(id) => {
              update((d) => {
                d.agentRuntimeId = id ?? null
              })
              setCodingRepos([])
            }}
            outerStyles={{ width: '100%' }}
          />
        </FillLevelDiv>
      </FormField>
      <FormField label="Mode">
        <RadioGroup
          value={mode}
          onChange={(v) =>
            update((d) => {
              d.configuration ??= {}
              d.configuration.coding ??= {}
              d.configuration.coding.mode = v as AgentRunMode
            })
          }
          css={{ display: 'flex', gap: 16 }}
        >
          <Radio value={AgentRunMode.Analyze}>Analyze</Radio>
          <Radio value={AgentRunMode.Write}>Write</Radio>
        </RadioGroup>
      </FormField>
      <FormField
        label="Allowed repositories"
        hint={
          allowedRepos
            ? 'Select from allowed repos for this runtime'
            : 'Add repo URLs the agent can read or write. One per line or use Add.'
        }
      >
        {allowedRepos ? (
          <Select
            label="Select repositories"
            selectionMode="multiple"
            selectedKeys={new Set(repos)}
            onSelectionChange={(keys) => setCodingRepos([...keys].map(String))}
          >
            {allowedRepos.map((url) => (
              <ListBoxItem
                key={url}
                label={url}
              />
            ))}
          </Select>
        ) : (
          <Flex
            direction="column"
            gap="xsmall"
            width="100%"
          >
            <Flex gap="xsmall">
              <Input2
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value)
                  setRepoError(null)
                }}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addRepo())
                }
                placeholder="Paste repo URL and press Enter or Add"
                error={!!repoError}
                css={{ flex: 1 }}
              />
              <Button
                secondary
                onClick={addRepo}
              >
                Add
              </Button>
            </Flex>
            {repoError && (
              <span
                css={{
                  fontSize: 12,
                  color: 'var(--text-danger, #c53030)',
                }}
              >
                {repoError}
              </span>
            )}
            {repos.length > 0 && (
              <Flex
                flexWrap="wrap"
                gap="xsmall"
              >
                {repos.map((url) => (
                  <Chip
                    key={url}
                    size="small"
                    closeButton
                    clickable
                    onClick={() => removeRepo(url)}
                  >
                    {url}
                  </Chip>
                ))}
              </Flex>
            )}
          </Flex>
        )}
      </FormField>
    </>
  )
}

export function WorkbenchAccessPolicyStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const update = createFormUpdater(setFormState)
  const readBindings = formState.readBindings ?? []
  const writeBindings = formState.writeBindings ?? []

  if (!formState) return null

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <Flex
        direction="column"
        gap="xsmall"
      >
        <OverlineH3 $color="text-xlight">Read permissions</OverlineH3>
        <FormBindings
          bindings={readBindings}
          setBindings={(next: PolicyBindingFragment[]) =>
            update((d) => {
              d.readBindings = next
            })
          }
          hints={{
            user: 'Users with read permissions for this workbench',
            group: 'Groups with read permissions for this workbench',
          }}
        />
      </Flex>
      <Divider backgroundColor="border" />
      <Flex
        direction="column"
        gap="xsmall"
      >
        <OverlineH3 $color="text-xlight">Write permissions</OverlineH3>
        <FormBindings
          bindings={writeBindings}
          setBindings={(next: PolicyBindingFragment[]) =>
            update((d) => {
              d.writeBindings = next
            })
          }
          hints={{
            user: 'Users with write permissions for this workbench',
            group: 'Groups with write permissions for this workbench',
          }}
        />
      </Flex>
    </Flex>
  )
}

export function WorkbenchAttachToolsStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const update = createFormUpdater(setFormState)

  const { data, error, loading } = useFetchPaginatedData({
    queryHook: useWorkbenchToolsQuery,
    keyPath: ['workbenchTools'],
  })

  if (!formState) return null

  const tools = mapExistingNodes(data?.workbenchTools)

  const selectedToolIds = (formState.toolAssociations ?? [])
    .map((ta) => ta?.toolId)
    .filter(isNonNullable)

  const toolsById = new Map(tools.map((tool) => [tool.id, tool]))

  const selectedTools = selectedToolIds
    .map((toolId) => toolsById.get(toolId))
    .filter(isNonNullable)

  const setSelectedToolIds = (ids: string[]) =>
    update((wfs) => {
      wfs.toolAssociations = ids.map((toolId) => ({ toolId }))
    })

  if (!data && loading) {
    return <CardGridSkeleton count={4} />
  }

  if (error) {
    return <GqlError error={error} />
  }

  return !data ? (
    <EmptyStateCompact
      message="You have not set up any tools yet"
      description="You can set up tools by clicking the button below. Tools can also be added later."
      cssProps={{ '& *': { textWrap: 'pretty' } }}
    >
      <Button
        secondary
        endIcon={<ArrowTopRightIcon size={16} />}
        as={Link}
        to={WORKBENCHES_TOOLS_ADD_ABS_PATH}
      >
        Set up tools
      </Button>
    </EmptyStateCompact>
  ) : (
    <Flex
      direction="column"
      gap="medium"
    >
      <FormField
        label={
          <Flex
            align="center"
            justify="space-between"
            width="100%"
          >
            <span>Add tools</span>
            <InlineA
              css={{ fontWeight: 400 }}
              href={WORKBENCHES_TOOLS_ABS_PATH}
              target="_self"
              rel={undefined}
            >
              Add or remove tools
            </InlineA>
          </Flex>
        }
      >
        <Select
          label="Add tools"
          triggerButton={
            <SelectButton>
              <Flex
                align="center"
                gap="xsmall"
              >
                <Chip
                  fillLevel={3}
                  size="small"
                >
                  {selectedToolIds.length}
                </Chip>
                <span>Tools selected</span>
              </Flex>
            </SelectButton>
          }
          selectionMode="multiple"
          selectedKeys={selectedToolIds}
          onSelectionChange={(keys) =>
            setSelectedToolIds(Array.from(keys).map(String))
          }
          isDisabled={loading}
        >
          {tools.map((tool) => (
            <ListBoxItem
              key={tool.id}
              label={tool.name}
              leftContent={
                <IconFrame
                  icon={<WorkbenchToolIcon type={tool.tool} />}
                  size="xsmall"
                />
              }
            />
          ))}
        </Select>
      </FormField>
      {selectedTools.length > 0 && (
        <CardGrid
          styles={{
            ...workbenchToolCardGridStyles(320),
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          }}
        >
          {selectedTools.map(({ id, name, tool: type }) => (
            <Card key={id}>
              <WorkbenchToolCardBody>
                <Flex
                  align="center"
                  justify="space-between"
                  width="100%"
                  gap="small"
                >
                  <StackedText
                    first={name}
                    firstPartialType="body2Bold"
                    firstColor="text"
                    second={TOOL_TYPE_TO_LABEL[type]}
                    icon={
                      <IconFrame
                        circle
                        type="secondary"
                        icon={
                          <WorkbenchToolIcon
                            size={20}
                            type={type}
                          />
                        }
                      />
                    }
                    css={{ minWidth: 0, flex: 1 }}
                  />
                  <IconFrame
                    circle
                    clickable
                    icon={<CloseIcon />}
                    tooltip="Remove from selection"
                    onClick={() =>
                      setSelectedToolIds(
                        selectedToolIds.filter((toolId) => toolId !== id)
                      )
                    }
                  />
                </Flex>
              </WorkbenchToolCardBody>
            </Card>
          ))}
        </CardGrid>
      )}
    </Flex>
  )
}

const EditableDivWrapperSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.medium,
  background: theme.colors['fill-zero'],
}))

const skillsFilesToText = (files: Nullable<string>[] | null): string =>
  (files?.filter(Boolean).join('\n') ?? '') || ''

const textToSkillsFiles = (text: string): (string | null)[] =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

const createFormUpdater =
  (setFormState: FormStateSetter) =>
  (recipe: (draft: WorkbenchFormState) => void) =>
    setFormState(produce(recipe))

export const WORKBENCH_STEP_LABELS = [
  'Workbench setup',
  'Skills configuration',
  'Coding agent',
  'Access policy',
  'Attach tools',
] as const
export type WorkbenchStepLabel = (typeof WORKBENCH_STEP_LABELS)[number]
type WorkbenchFormStep = {
  label: WorkbenchStepLabel
  component: (props: WorkbenchFormStepProps) => ReactNode
}
export const workbenchFormSteps: WorkbenchFormStep[] = [
  { label: 'Workbench setup', component: WorkbenchSetupStep },
  { label: 'Skills configuration', component: WorkbenchSkillsConfigStep },
  { label: 'Coding agent', component: WorkbenchCodingAgentStep },
  { label: 'Access policy', component: WorkbenchAccessPolicyStep },
  { label: 'Attach tools', component: WorkbenchAttachToolsStep },
]
