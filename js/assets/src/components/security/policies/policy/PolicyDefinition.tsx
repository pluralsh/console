import {
  Button,
  Chip,
  Code,
  CodeEditor,
  Flex,
  FormField,
  ListBoxFooterPlus,
  ListBoxItem,
  PencilIcon,
  Select,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { SendToWorkbenchButton } from 'components/ai/insights/SendInsightToWorkbench'
import { useEnsurePagedItem } from 'components/hooks/useEnsurePagedItem'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP, OverlineH1 } from 'components/utils/typography/Text'
import {
  useDeletePolicyMutation,
  useEvaluatePolicyLazyQuery,
  usePolicyEvaluationsQuery,
  useUpdatePolicyMutation,
} from 'generated/graphql'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from 'react-router-dom'
import { POLICIES_ABS_PATH } from 'routes/securityRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isValidJson } from 'utils/isValidJson'
import { mapExistingNodes } from 'utils/graphql'
import { PolicyDetailsContext } from './PolicyDetails'
import { PolicyEditModal } from './PolicyEditModal'
import { PolicyPanelHeader } from './PolicyPanelHeader'
import {
  formatEvalSelectLabel,
  getPolicyEvalDecision,
  PolicyEvalMap,
  stringifyEvalMap,
} from './policyEval'
import {
  buildPolicyWorkbenchPrompt,
  POLICY_UPDATE_PLACEHOLDER,
} from './policyWorkbenchPrompt'

const EMPTY_JSON = '{}'
const INPUT_JSON_MAX_HEIGHT = 160
const editorOptions = { minimap: { enabled: false }, wordWrap: 'on' as const }

export function PolicyDefinition() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const { policy, setHeaderActions } = useOutletContext<PolicyDetailsContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const evalIdFromSearch = searchParams.get('evalId')
  const savedPolicy = policy?.policy ?? ''
  const [buffer, setBuffer] = useState<string>()
  const [inputJson, setInputJson] = useState(EMPTY_JSON)
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(
    evalIdFromSearch
  )
  const [editorEpoch, setEditorEpoch] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const appliedEvalId = useRef<string | null>(null)
  const editorValue = buffer ?? savedPolicy
  const dirty = editorValue !== savedPolicy
  const inputIsValid = isValidJson(inputJson)

  const { data, loading, pageInfo, fetchNextPage } = useFetchPaginatedData(
    {
      queryHook: usePolicyEvaluationsQuery,
      keyPath: ['policy', 'policyEvaluations'],
      skip: !policy?.id,
    },
    { id: policy?.id ?? '' }
  )
  const evals = useMemo(
    () => mapExistingNodes(data?.policy?.policyEvaluations),
    [data]
  )
  const evalOptions = useMemo(
    () =>
      evals.map((evaluation) => ({
        id: evaluation.id,
        label: formatEvalSelectLabel(
          evaluation.id,
          evaluation.input as PolicyEvalMap,
          evaluation.insertedAt
        ),
      })),
    [evals]
  )
  const { item: selectedEval } = useEnsurePagedItem(evals, selectedEvalId, {
    data,
    loading,
    hasNextPage: pageInfo?.hasNextPage,
    fetchNextPage,
  })
  const selectedEvalLabel = evalOptions.find(
    (option) => option.id === selectedEval?.id
  )?.label

  const [
    evaluatePolicy,
    { data: evalResult, loading: evaluating, error: evalError },
  ] = useEvaluatePolicyLazyQuery({ fetchPolicy: 'network-only' })
  const [updatePolicy, { loading: saving, error: saveError }] =
    useUpdatePolicyMutation({
      onCompleted: () => {
        popToast({ content: 'Policy saved', severity: 'success' })
      },
    })
  const [deletePolicy, { loading: deleting, error: deleteError }] =
    useDeletePolicyMutation({
      variables: { id: policy?.id ?? '' },
      onCompleted: () => navigate(POLICIES_ABS_PATH),
    })

  const output = evalResult?.evaluatePolicy as PolicyEvalMap | undefined
  const decision = output
    ? getPolicyEvalDecision(output, policy?.type)
    : undefined

  const onRevert = useCallback(() => {
    setBuffer(savedPolicy)
    setEditorEpoch((epoch) => epoch + 1)
  }, [savedPolicy])

  const onSave = useCallback(() => {
    if (!policy?.id || !dirty) return

    updatePolicy({
      variables: { id: policy.id, attributes: { policy: editorValue } },
    })
  }, [dirty, editorValue, policy, updatePolicy])

  const onRun = useCallback(() => {
    if (!policy?.id || !inputIsValid) return

    evaluatePolicy({
      variables: {
        policyId: policy.id,
        input: inputJson,
        policy: editorValue,
      },
    })
  }, [editorValue, evaluatePolicy, inputIsValid, inputJson, policy])

  const onSelectEval = useCallback(
    (id: string) => {
      setSelectedEvalId(id)
      appliedEvalId.current = null
      setSearchParams(id ? { evalId: id } : {}, { replace: true })
    },
    [setSearchParams]
  )
  const onEdit = useCallback(() => setEditOpen(true), [])
  const onDelete = useCallback(() => setConfirmDelete(true), [])

  useEffect(() => {
    if (!evalIdFromSearch || selectedEvalId === evalIdFromSearch) return

    setSelectedEvalId(evalIdFromSearch)
  }, [evalIdFromSearch, selectedEvalId])

  useEffect(() => {
    if (!selectedEval || appliedEvalId.current === selectedEval.id) return

    appliedEvalId.current = selectedEval.id
    setInputJson(stringifyEvalMap(selectedEval.input as PolicyEvalMap))
  }, [selectedEval])

  const workbenchPrompt = useMemo(
    () =>
      buildPolicyWorkbenchPrompt({
        name: policy?.name,
        policy: editorValue,
        input: inputJson,
      }),
    [editorValue, inputJson, policy?.name]
  )

  useLayoutEffect(() => {
    setHeaderActions(
      <DefinitionActions
        backLabel={policy?.name ?? 'Policy'}
        dirty={dirty}
        onDelete={onDelete}
        onEdit={onEdit}
        onRevert={onRevert}
        onSave={onSave}
        saving={saving}
        workbenchPrompt={workbenchPrompt}
      />
    )
  }, [
    dirty,
    onDelete,
    onEdit,
    onRevert,
    onSave,
    policy?.name,
    saving,
    setHeaderActions,
    workbenchPrompt,
  ])

  useEffect(() => () => setHeaderActions(null), [setHeaderActions])

  return (
    <>
      <WrapperSC>
        <EditorColumnSC>
          <PolicyPanelHeader>Editor</PolicyPanelHeader>
          <EditorBodySC>
            <CaptionP $color="text-xlight">
              Simulation runs against this buffer, not the saved policy.
            </CaptionP>
            {saveError && <GqlError error={saveError} />}
            <EditorWrapSC>
              <CodeEditor
                key={`${policy?.id ?? 'policy'}-${editorEpoch}`}
                fillLevel={0}
                height="100%"
                language="rego"
                onChange={setBuffer}
                options={editorOptions}
                value={editorValue}
              />
            </EditorWrapSC>
          </EditorBodySC>
        </EditorColumnSC>
        <SimulatorColumnSC>
          <PolicyPanelHeader>Simulator</PolicyPanelHeader>
          <SimulatorBodySC>
            <FormField label="Past evals">
              <SelectRowSC>
                <SelectGrowSC>
                  <Select
                    isDisabled={evalOptions.length === 0}
                    label={
                      selectedEvalLabel ??
                      (evalOptions.length === 0
                        ? 'No past evaluations'
                        : 'Select a past eval')
                    }
                    onSelectionChange={(id) => onSelectEval(`${id}`)}
                    selectedKey={selectedEval?.id}
                    dropdownFooterFixed={
                      pageInfo?.hasNextPage ? (
                        <ListBoxFooterPlus onClick={() => fetchNextPage()}>
                          Load more
                        </ListBoxFooterPlus>
                      ) : undefined
                    }
                  >
                    {evalOptions.map(({ id, label }) => (
                      <ListBoxItem
                        key={id}
                        label={label}
                        textValue={label}
                      />
                    ))}
                  </Select>
                </SelectGrowSC>
                <Button
                  css={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                  disabled={!inputIsValid || !policy?.id}
                  loading={evaluating}
                  onClick={onRun}
                  primary
                >
                  Run simulation
                </Button>
              </SelectRowSC>
            </FormField>
            <JsonPanelSC>
              <OverlineH1 $color="text-xlight">Input</OverlineH1>
              <JsonBlockSC>
                <Code
                  css={{ flex: 1, minHeight: 0 }}
                  height="100%"
                  language="json"
                  showHeader={false}
                >
                  {inputJson}
                </Code>
              </JsonBlockSC>
            </JsonPanelSC>
            {evalError && <GqlError error={evalError} />}
            <OutputBodySC>
              <Flex
                align="center"
                justify="space-between"
              >
                <OverlineH1 $color="text-xlight">Output</OverlineH1>
                {evaluating ? (
                  <Chip
                    loading
                    severity="info"
                    size="small"
                  >
                    Running
                  </Chip>
                ) : (
                  <Chip
                    severity={decision?.severity ?? 'neutral'}
                    size="small"
                  >
                    {decision?.label ?? 'Not run yet'}
                  </Chip>
                )}
              </Flex>
              {evaluating ? (
                <OutputSkeletonSC>
                  {Array.from({ length: 5 }, (_, index) => (
                    <RectangleSkeleton
                      key={index}
                      $height={30}
                      $width="100%"
                    />
                  ))}
                </OutputSkeletonSC>
              ) : output == null ? (
                <OutputEmptySC>
                  No output yet. Pick a past evaluation, then run it against the
                  current buffer.
                </OutputEmptySC>
              ) : (
                <Code
                  css={{ flex: 1, minHeight: 0 }}
                  height="100%"
                  language="json"
                  showHeader={false}
                >
                  {stringifyEvalMap(output)}
                </Code>
              )}
            </OutputBodySC>
          </SimulatorBodySC>
        </SimulatorColumnSC>
      </WrapperSC>
      <PolicyEditModal
        onClose={() => setEditOpen(false)}
        open={editOpen}
        policy={policy}
      />
      <Confirm
        close={() => setConfirmDelete(false)}
        confirmationEnabled
        confirmationText={policy?.name ?? 'delete'}
        destructive
        error={deleteError}
        label="Delete"
        loading={deleting}
        open={confirmDelete}
        submit={() => deletePolicy()}
        text={
          <>
            Are you sure you want to delete{' '}
            <span css={{ color: theme.colors['text-danger'] }}>
              “{policy?.name}”
            </span>
            ?
          </>
        }
        title="Delete policy"
      />
    </>
  )
}

function DefinitionActions({
  backLabel,
  dirty,
  saving,
  workbenchPrompt,
  onRevert,
  onSave,
  onEdit,
  onDelete,
}: {
  backLabel: string
  dirty: boolean
  saving: boolean
  workbenchPrompt: string
  onRevert: () => void
  onSave: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const theme = useTheme()

  return (
    <>
      <SendToWorkbenchButton
        backLabel={backLabel}
        editable
        initialPrompt={workbenchPrompt}
        popoverTitle="Send policy to workbench"
        selectText={POLICY_UPDATE_PLACEHOLDER}
        submitLabel="Update with workbench"
        secondary
        small
      />
      <Button
        disabled={!dirty}
        onClick={onRevert}
        secondary
        small
      >
        Revert
      </Button>
      <Button
        disabled={!dirty}
        loading={saving}
        onClick={onSave}
        primary
        small
      >
        Save policy
      </Button>
      <MoreMenu
        onSelectionChange={(key) => {
          if (key === 'edit') onEdit()
          if (key === 'delete') onDelete()
        }}
        triggerProps={{ iconFrameType: 'secondary' }}
      >
        <ListBoxItem
          key="edit"
          label="Edit policy"
          leftContent={<PencilIcon />}
        />
        <ListBoxItem
          destructive
          key="delete"
          label="Delete policy"
          leftContent={<TrashCanIcon color={theme.colors['icon-danger']} />}
        />
      </MoreMenu>
    </>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'grid',
  flex: 1,
  gridTemplateColumns: 'minmax(0, 624px) minmax(0, 1fr)',
  gridTemplateRows: 'minmax(0, 1fr)',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  borderTop: theme.borders.default,
}))

const EditorColumnSC = styled.section(({ theme }) => ({
  borderRight: theme.borders.default,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
}))

const SimulatorColumnSC = styled.section({
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
})

const EditorBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.small,
  minHeight: 0,
  overflow: 'hidden',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const SimulatorBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing.medium,
}))

const OutputBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.small,
  minHeight: 140,
  overflow: 'hidden',
}))

const OutputSkeletonSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minHeight: 0,
  width: '100%',
}))

const OutputEmptySC = styled.div(({ theme }) => ({
  ...theme.partials.text.code,
  alignItems: 'center',
  border: `1px dashed ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.large,
  color: theme.colors['text-xlight'],
  display: 'flex',
  flex: 1,
  justifyContent: 'center',
  minHeight: 0,
  padding: theme.spacing.large,
  textAlign: 'center',
}))

const SelectRowSC = styled.div(({ theme }) => ({
  alignItems: 'stretch',
  display: 'flex',
  gap: theme.spacing.small,
  minWidth: 0,
  width: '100%',
}))

const SelectGrowSC = styled.div({
  flex: 1,
  minWidth: 0,
  '& > .selectInner': {
    width: '100%',
  },
})

const JsonPanelSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: theme.spacing.small,
  minWidth: 0,
}))

const JsonBlockSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  height: INPUT_JSON_MAX_HEIGHT,
  maxHeight: INPUT_JSON_MAX_HEIGHT,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  width: '100%',
})

const EditorWrapSC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
})
