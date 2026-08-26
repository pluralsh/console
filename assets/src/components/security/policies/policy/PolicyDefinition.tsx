import {
  Button,
  Chip,
  Code,
  CodeEditor,
  Flex,
  FormField,
  ListBoxItem,
  Select,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP, OverlineH1 } from 'components/utils/typography/Text'
import {
  PolicyFragment,
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
import {
  formatEvalSelectLabel,
  isPolicyEvalDenied,
  PolicyEvalMap,
  stringifyEvalMap,
} from './policyEval'

const EMPTY_JSON = '{}'
const editorOptions = { minimap: { enabled: false }, wordWrap: 'on' as const }
const jsonEditorOptions = {
  ...editorOptions,
  lineNumbers: 'off' as const,
}

export function PolicyDefinition() {
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
  const selectedEval =
    evals.find((evaluation) => evaluation.id === selectedEvalId) ?? null
  const waitingForEval =
    !!selectedEvalId &&
    !selectedEval &&
    (!data || loading || !!pageInfo?.hasNextPage)

  const [
    evaluatePolicy,
    { data: evalResult, loading: evaluating, error: evalError },
  ] = useEvaluatePolicyLazyQuery({ fetchPolicy: 'network-only' })
  const [updatePolicy, { loading: saving, error: saveError }] =
    useUpdatePolicyMutation()

  const output = evalResult?.evaluatePolicy as PolicyEvalMap | undefined
  const denied = output ? isPolicyEvalDenied(output) : undefined

  useEffect(() => {
    if (!waitingForEval || loading) return

    fetchNextPage()
  }, [fetchNextPage, loading, waitingForEval])

  useEffect(() => {
    if (!evalIdFromSearch || selectedEvalId === evalIdFromSearch) return

    setSelectedEvalId(evalIdFromSearch)
  }, [evalIdFromSearch, selectedEvalId])

  useEffect(() => {
    if (!selectedEval || appliedEvalId.current === selectedEval.id) return

    appliedEvalId.current = selectedEval.id
    setInputJson(stringifyEvalMap(selectedEval.input as PolicyEvalMap))
  }, [selectedEval])

  const onRevert = useCallback(() => {
    setBuffer(savedPolicy)
    setEditorEpoch((epoch) => epoch + 1)
  }, [savedPolicy])

  const onSave = useCallback(() => {
    if (!policy?.id || !dirty) return

    updatePolicy({
      variables: { id: policy.id, attributes: { policy: editorValue } },
    })
  }, [dirty, editorValue, policy?.id, updatePolicy])

  const onRun = useCallback(() => {
    if (!policy?.id || !inputIsValid) return

    evaluatePolicy({
      variables: {
        policyId: policy.id,
        input: JSON.stringify(JSON.parse(inputJson)),
        policy: editorValue,
      },
    })
  }, [editorValue, evaluatePolicy, inputIsValid, inputJson, policy?.id])

  const onSelectEval = useCallback(
    (id: string) => {
      setSelectedEvalId(id)
      appliedEvalId.current = null
      setSearchParams(id ? { evalId: id } : {}, { replace: true })
    },
    [setSearchParams]
  )

  useLayoutEffect(() => {
    setHeaderActions(
      <DefinitionActions
        dirty={dirty}
        saving={saving}
        onRevert={onRevert}
        onSave={onSave}
        policy={policy}
      />
    )
  }, [dirty, onRevert, onSave, policy, saving, setHeaderActions])

  useEffect(() => () => setHeaderActions(null), [setHeaderActions])

  return (
    <WrapperSC>
      <EditorColumnSC>
        <PanelHeaderSC>Editor</PanelHeaderSC>
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
        <SimulatorTopSC>
          <PanelHeaderSC>Simulator</PanelHeaderSC>
          <SimulatorBodySC>
            <FormField label="Past evals">
              <Select
                isDisabled={evals.length === 0}
                label={
                  selectedEval
                    ? formatEvalSelectLabel(
                        selectedEval.id,
                        selectedEval.input as PolicyEvalMap,
                        selectedEval.insertedAt
                      )
                    : evals.length === 0
                      ? 'No past evaluations'
                      : 'Select a past eval'
                }
                onSelectionChange={(id) => onSelectEval(`${id}`)}
                selectedKey={selectedEval?.id}
              >
                {evals.length === 0 ? (
                  <ListBoxItem
                    key="empty"
                    label="No past evaluations"
                    textValue="No past evaluations"
                  />
                ) : (
                  evals.map((evaluation) => (
                    <ListBoxItem
                      key={evaluation.id}
                      label={formatEvalSelectLabel(
                        evaluation.id,
                        evaluation.input as PolicyEvalMap,
                        evaluation.insertedAt
                      )}
                      textValue={formatEvalSelectLabel(
                        evaluation.id,
                        evaluation.input as PolicyEvalMap,
                        evaluation.insertedAt
                      )}
                    />
                  ))
                )}
              </Select>
            </FormField>
            <JsonPanelSC>
              <OverlineH1 $color="text-xlight">Input</OverlineH1>
              <EditorWrapSC>
                <CodeEditor
                  key={selectedEval?.id ?? 'input'}
                  height="100%"
                  language="json"
                  onChange={setInputJson}
                  options={jsonEditorOptions}
                  value={inputJson}
                />
              </EditorWrapSC>
            </JsonPanelSC>
            {evalError && <GqlError error={evalError} />}
            <Button
              css={{ width: '100%' }}
              disabled={!inputIsValid || !policy?.id}
              loading={evaluating}
              onClick={onRun}
              primary
              small
            >
              Run simulation
            </Button>
          </SimulatorBodySC>
        </SimulatorTopSC>
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
                severity={
                  denied == null ? 'neutral' : denied ? 'danger' : 'success'
                }
                size="small"
              >
                {denied == null ? 'Not run yet' : denied ? 'Deny' : 'Allow'}
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
              No output yet. Pick a past evaluation or edit the input, then run
              it against the current buffer.
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
      </SimulatorColumnSC>
    </WrapperSC>
  )
}

function DefinitionActions({
  dirty,
  saving,
  onRevert,
  onSave,
  policy,
}: {
  dirty: boolean
  saving: boolean
  onRevert: () => void
  onSave: () => void
  policy: PolicyFragment | null | undefined
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePolicy, { loading, error }] = useDeletePolicyMutation({
    variables: { id: policy?.id ?? '' },
    onCompleted: () => navigate(POLICIES_ABS_PATH),
  })

  return (
    <>
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
          if (key === 'delete') setConfirmDelete(true)
        }}
        triggerProps={{ iconFrameType: 'secondary' }}
      >
        <ListBoxItem
          destructive
          key="delete"
          label="Delete policy"
          leftContent={<TrashCanIcon color={theme.colors['icon-danger']} />}
        />
      </MoreMenu>
      <Confirm
        close={() => setConfirmDelete(false)}
        confirmationEnabled
        confirmationText={policy?.name ?? 'delete'}
        destructive
        error={error}
        label="Delete"
        loading={loading}
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

const SimulatorTopSC = styled.div(({ theme }) => ({
  borderBottom: theme.borders.default,
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
}))

const PanelHeaderSC = styled.header(({ theme }) => ({
  ...theme.partials.text.overline,
  backgroundColor: theme.colors['fill-one'],
  boxSizing: 'border-box',
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  lineHeight: 1,
  minHeight: 40,
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders['fill-one'],
  width: '100%',
}))

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
  overflow: 'hidden',
  padding: theme.spacing.medium,
}))

const OutputBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.small,
  minHeight: 0,
  overflow: 'hidden',
  padding: theme.spacing.medium,
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

const JsonPanelSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.small,
  minHeight: 0,
}))

const EditorWrapSC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
})
