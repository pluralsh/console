import {
  ArrowTopRightIcon,
  Button,
  Card,
  CardTab,
  CardTabs,
  Checkbox,
  Chip,
  CloseIcon,
  Divider,
  Flex,
  FormField,
  IconFrame,
  InfoOutlineIcon,
  Input2,
  isValidRepoUrl,
  ListBoxItem,
  Radio,
  RadioGroup,
  Select,
  SelectButton,
  Switch,
  Tooltip,
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
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { AIAgentRuntimesSelector } from 'components/ai/agent-runs/AIAgentRuntimesSelector'
import {
  RepositorySelector,
  ServiceGitFolderField,
  ServiceGitRefField,
} from 'components/cd/services/deployModal/DeployServiceSettingsGit'
import { FormBindings } from 'components/utils/bindings'
import { EditableDiv } from 'components/utils/EditableDiv'
import { CaptionP, InlineA, OverlineH3 } from 'components/utils/typography/Text'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

import { BABYSITTING_TOOLTIP } from 'components/ai/babysittingTooltip'
import { EmptyStateCompact } from 'components/ai/AIThreads'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { Link } from 'react-router-dom'
import {
  WORKBENCHES_TOOLS_ABS_PATH,
  WORKBENCHES_TOOLS_ADD_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import {
  CardGrid,
  CardGridSkeleton,
} from '../../../self-service/catalog/CatalogsGrid'
import { GqlError } from '../../../utils/Alert'
import { StackedText } from '../../../utils/table/StackedText'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'
import {
  categoryToLabel,
  getWorkbenchToolLabel,
  WorkbenchToolCardBody,
  workbenchToolCardGridStyles,
  WorkbenchToolIcon,
} from '../../tools/workbenchToolsUtils'
import { WorkbenchesConfiguredToolMetadata } from '../../WorkbenchesConfiguredToolMetadata'
import { PluralSkillsSubStep } from './PluralSkillsSubStep'
import {
  useWorkbenchFormCardTabs,
  WorkbenchFormState,
} from './WorkbenchCreateOrEdit'

export type FormStateSetter = Dispatch<SetStateAction<WorkbenchFormState>>
export type WorkbenchFormStepProps = {
  formState: WorkbenchFormState
  setFormState: FormStateSetter
}

function CapabilityCheckbox(props: {
  checked: boolean
  label: string
  tooltip: string
  onCheckedChange: (checked: boolean) => void
}) {
  const { checked, label, tooltip, onCheckedChange } = props
  return (
    <Tooltip
      label={tooltip}
      placement="top"
    >
      <span css={{ display: 'inline-flex' }}>
        <Checkbox
          small
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        >
          {label}
        </Checkbox>
      </span>
    </Tooltip>
  )
}

export function WorkbenchSetupStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const theme = useTheme()
  const update = createFormUpdater(setFormState)
  const infra = formState.configuration?.infrastructure
  const observability = formState.configuration?.observability
  const capabilityCheckboxGridCss = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    alignItems: 'start' as const,
    columnGap: theme.spacing.large,
    rowGap: theme.spacing.xxsmall,
  }
  return (
    <>
      <FormField
        required
        infoTooltip="Name must be unique"
        label="Workbench name"
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

      <Divider backgroundColor="border" />

      <Flex
        direction="column"
        gap="large"
      >
        <FormField label="Enable Infrastructure">
          <Flex
            direction="column"
            gap="small"
          >
            <CaptionP $color="text-light">
              Configure Plural native infrastructure integrations. Tool access
              respects RBAC baked into these integrations so agents only reach
              resources your organization allows.
            </CaptionP>
            <Flex css={capabilityCheckboxGridCss}>
              <CapabilityCheckbox
                label="Stacks"
                checked={infra?.stacks ?? false}
                tooltip="Expose stack inspection tools for Plural stack definitions, runs, and related context."
                onCheckedChange={(checked) =>
                  update((d) => {
                    d.configuration ??= {}
                    d.configuration.infrastructure ??= {}
                    d.configuration.infrastructure.stacks = checked
                  })
                }
              />
              <CapabilityCheckbox
                label="Services"
                checked={infra?.services ?? false}
                tooltip="Expose service inspection tools for Plural-managed services, clusters, and deployment wiring."
                onCheckedChange={(checked) =>
                  update((d) => {
                    d.configuration ??= {}
                    d.configuration.infrastructure ??= {}
                    d.configuration.infrastructure.services = checked
                  })
                }
              />
              <CapabilityCheckbox
                label="Kubernetes"
                checked={infra?.kubernetes ?? false}
                tooltip="Expose tools to get and list Kubernetes API resources via the cluster control plane. Respects k8s RBAC."
                onCheckedChange={(checked) =>
                  update((d) => {
                    d.configuration ??= {}
                    d.configuration.infrastructure ??= {}
                    d.configuration.infrastructure.kubernetes = checked
                  })
                }
              />
              <CapabilityCheckbox
                label="Pod Logs"
                checked={infra?.podLogs ?? false}
                tooltip="Expose a tool to fetch container stdout/stderr logs from pods, respecting k8s RBAC. Separate from Plural integrated logs under Observability."
                onCheckedChange={(checked) =>
                  update((d) => {
                    d.configuration ??= {}
                    d.configuration.infrastructure ??= {}
                    d.configuration.infrastructure.podLogs = checked
                  })
                }
              />
              <CapabilityCheckbox
                label="Vulnerabilities"
                checked={infra?.vulnerabilities ?? false}
                tooltip="Lists vulnerabilities from Trivy that are auto-associated with Plural Services."
                onCheckedChange={(checked) =>
                  update((d) => {
                    d.configuration ??= {}
                    d.configuration.infrastructure ??= {}
                    d.configuration.infrastructure.vulnerabilities = checked
                  })
                }
              />
            </Flex>
          </Flex>
        </FormField>
        <FormField label="Enable Observability">
          <Flex
            direction="column"
            gap="small"
          >
            <CaptionP $color="text-light">
              These tools integrate directly with Plural&apos;s global
              Prometheus metrics and log aggregation. To provide an external
              observability provider, add a tool from the integrations page
              instead.
            </CaptionP>
            <Flex css={capabilityCheckboxGridCss}>
              <CapabilityCheckbox
                label="Metrics"
                checked={observability?.metrics ?? false}
                tooltip="Enable Plural-built metrics exploration for this workbench against your configured metrics backends."
                onCheckedChange={(checked) =>
                  update((d) => {
                    d.configuration ??= {}
                    d.configuration.observability ??= {}
                    d.configuration.observability.metrics = checked
                  })
                }
              />
              <CapabilityCheckbox
                label="Log Aggregation"
                checked={observability?.logs ?? false}
                tooltip="Enable Plural-built log browsing and aggregates for this workbench against your configured log backends (not Kubernetes pod log streaming)."
                onCheckedChange={(checked) =>
                  update((d) => {
                    d.configuration ??= {}
                    d.configuration.observability ??= {}
                    d.configuration.observability.logs = checked
                  })
                }
              />
            </Flex>
          </Flex>
        </FormField>
      </Flex>
    </>
  )
}

export function WorkbenchSkillsConfigStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const { setTabs } = useWorkbenchFormCardTabs()
  const [subTab, setSubTab] = useState<'git-skills' | 'plural-skills'>(
    'plural-skills'
  )

  useEffect(() => {
    setTabs(
      <CardTabs>
        <CardTab
          active={subTab === 'plural-skills'}
          onClick={() => setSubTab('plural-skills')}
        >
          Plural skills
        </CardTab>
        <CardTab
          active={subTab === 'git-skills'}
          onClick={() => setSubTab('git-skills')}
        >
          Git skills
        </CardTab>
      </CardTabs>
    )
    return () => setTabs(null)
  }, [setTabs, subTab])

  return subTab === 'git-skills' ? (
    <GitSkillsSubStep
      formState={formState}
      setFormState={setFormState}
    />
  ) : (
    <PluralSkillsSubStep
      formState={formState}
      setFormState={setFormState}
    />
  )
}

function GitSkillsSubStep({ formState, setFormState }: WorkbenchFormStepProps) {
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
                css={{ minHeight: 75 }}
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
  const enableBabysitting = coding?.enableBabysitting ?? false

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
      {mode === AgentRunMode.Write && (
        <Flex
          align="center"
          gap="xsmall"
        >
          <Switch
            checked={enableBabysitting}
            onChange={(checked) =>
              update((d) => {
                d.configuration ??= {}
                d.configuration.coding ??= {}
                d.configuration.coding.enableBabysitting = checked
              })
            }
          >
            Enable babysitting
          </Switch>
          <Tooltip
            label={BABYSITTING_TOOLTIP}
            css={{ maxWidth: 320 }}
          >
            <InfoOutlineIcon
              color="icon-xlight"
              size={14}
              css={{ cursor: 'help', flexShrink: 0 }}
            />
          </Tooltip>
        </Flex>
      )}
    </>
  )
}

export function WorkbenchAccessPolicyStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  if (!formState) return null

  return (
    <AccessPolicySubStep
      formState={formState}
      setFormState={setFormState}
    />
  )
}

function AccessPolicySubStep({
  formState,
  setFormState,
}: WorkbenchFormStepProps) {
  const update = createFormUpdater(setFormState)
  const readBindings = formState.readBindings ?? []
  const writeBindings = formState.writeBindings ?? []

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

  return tools.length === 0 ? (
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
                  icon={
                    <WorkbenchToolIcon
                      type={tool.tool}
                      provider={tool.cloudConnection?.provider}
                    />
                  }
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
            padding: 0,
          }}
        >
          {selectedTools.map(
            ({ id, name, tool: type, categories, cloudConnection }) => (
              <Card key={id}>
                <WorkbenchToolCardBody>
                  <Flex
                    align="center"
                    justify="space-between"
                    width="100%"
                    gap="small"
                  >
                    <Flex
                      align="center"
                      gap="small"
                      css={{ minWidth: 0, flex: 1 }}
                    >
                      <IconFrame
                        circle
                        type="secondary"
                        icon={
                          <WorkbenchToolIcon
                            size={20}
                            type={type}
                            provider={cloudConnection?.provider}
                          />
                        }
                      />
                      <StackedText
                        truncate
                        first={name}
                        firstPartialType="body2Bold"
                        firstColor="text"
                        second={getWorkbenchToolLabel(
                          type,
                          cloudConnection?.provider
                        )}
                        css={{ minWidth: 0, flex: 1, width: 0 }}
                      />
                    </Flex>
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
                  <WorkbenchesConfiguredToolMetadata
                    toolId={id}
                    toolType={type}
                  />
                  <Flex
                    gap="xsmall"
                    wrap="wrap"
                  >
                    {categories?.filter(isNonNullable).map((cat, i) => (
                      <Chip
                        key={i}
                        size="small"
                      >
                        {categoryToLabel[cat]}
                      </Chip>
                    ))}
                  </Flex>
                </WorkbenchToolCardBody>
              </Card>
            )
          )}
        </CardGrid>
      )}
    </Flex>
  )
}

export const EditableDivWrapperSC = styled(Card)(({ theme }) => ({
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

export const createFormUpdater =
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
