import {
  Chip,
  Code,
  EmptyState,
  Flex,
  IconFrame,
  InfoOutlineIcon,
  Tab,
  TabList,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { OverlineH1, Subtitle1H1 } from 'components/utils/typography/Text'
import {
  PolicyEvaluationFragment,
  usePolicyEvaluationsQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  POLICIES_EVAL_PARAM_ID,
  POLICIES_PARAM_ID,
  getPolicyEvalAbsPath,
} from 'routes/securityRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { formatDateTime, fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { PolicyDetailsContext } from './PolicyDetails'
import { PolicyEvaluationsSidePanel } from './PolicyEvaluationsSidePanel'
import {
  formatEvalId,
  getPolicyEvalReason,
  getPolicyEvalTarget,
  getPolicyEvalToolName,
  isPolicyEvalDenied,
  PolicyEvalMap,
  stringifyEvalMap,
} from './policyEval'

type DetailTab = 'input' | 'output'

const detailTabs: { key: DetailTab; label: string }[] = [
  { key: 'input', label: 'Input' },
  { key: 'output', label: 'Output' },
]

export function PolicyEvaluations() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { policy } = useOutletContext<PolicyDetailsContext>()
  const params = useParams()
  const policyId = policy?.id ?? params[POLICIES_PARAM_ID] ?? ''
  const evalIdFromPath = params[POLICIES_EVAL_PARAM_ID]
  const [detailTab, setDetailTab] = useState<DetailTab>('input')
  const detailTabsStateRef = useRef<any>(undefined)

  const { data, loading, error } = usePolicyEvaluationsQuery({
    variables: { id: policyId, first: 100 },
    skip: !policyId,
    fetchPolicy: 'cache-and-network',
  })

  const evals = useMemo(
    () => mapExistingNodes(data?.policy?.policyEvaluations),
    [data]
  )
  const selectedEval =
    evals.find((evaluation) => evaluation.id === evalIdFromPath) ??
    evals[0] ??
    null

  useEffect(() => {
    if (!selectedEval?.id || evalIdFromPath === selectedEval.id) return

    navigate(getPolicyEvalAbsPath(policyId, selectedEval.id), { replace: true })
  }, [evalIdFromPath, navigate, policyId, selectedEval?.id])

  useEffect(() => {
    setDetailTab('input')
  }, [selectedEval?.id])

  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      <PolicyEvaluationsSidePanel
        evals={evals}
        loading={loading && !data}
        selectedEvalId={selectedEval?.id}
        onSelectEvalId={(evalId) =>
          navigate(getPolicyEvalAbsPath(policyId, evalId))
        }
      />
      {!selectedEval ? (
        <Flex
          align="center"
          flex={1}
          justify="center"
          minHeight={0}
        >
          <EmptyState message="No evaluations available yet." />
        </Flex>
      ) : (
        <ColumnsSC>
          <SummaryPanel
            evaluation={selectedEval}
            policyId={policyId}
            policyName={policy?.name}
          />
          <PanelSC $trimRightBorder>
            <Flex
              css={{
                backgroundColor: theme.colors['fill-one'],
                width: '100%',
              }}
            >
              <TabList
                stateRef={detailTabsStateRef}
                stateProps={{
                  orientation: 'horizontal',
                  selectedKey: detailTab,
                  onSelectionChange: (key) => setDetailTab(key as DetailTab),
                }}
                flexShrink={0}
              >
                {detailTabs.map((tab) => (
                  <Tab
                    key={tab.key}
                    textValue={tab.label}
                  >
                    {tab.label}
                  </Tab>
                ))}
              </TabList>
              <Flex
                flex={1}
                minWidth={0}
                css={{
                  alignSelf: 'stretch',
                  borderBottom: theme.borders.default,
                }}
              />
            </Flex>
            <PanelBodySC>
              <OverlineH1 $color="text-xlight">
                {detailTab === 'input' ? 'Input' : 'Output'}
              </OverlineH1>
              <Code
                language="json"
                showHeader={false}
              >
                {stringifyEvalMap(
                  (detailTab === 'input'
                    ? selectedEval.input
                    : selectedEval.output) as PolicyEvalMap
                )}
              </Code>
            </PanelBodySC>
          </PanelSC>
        </ColumnsSC>
      )}
    </WrapperSC>
  )
}

function SummaryPanel({
  evaluation,
  policyId,
  policyName,
}: {
  evaluation: PolicyEvaluationFragment
  policyId: string
  policyName?: string | null
}) {
  const theme = useTheme()
  const denied = isPolicyEvalDenied(evaluation.output as PolicyEvalMap)
  const toolName = getPolicyEvalToolName(evaluation.input as PolicyEvalMap)
  const target = getPolicyEvalTarget(evaluation.input as PolicyEvalMap)
  const policyIds = (evaluation.policyIds ?? []).map((id) =>
    id === policyId && policyName ? policyName : id
  )

  return (
    <PanelSC>
      <PanelHeaderSC>
        <Flex
          align="center"
          justify="space-between"
          width="100%"
        >
          <span>Summary</span>
          <IconFrame
            size="small"
            type="tertiary"
            tooltip="A sampled policy decision for a tool invocation."
            icon={<InfoOutlineIcon />}
          />
        </Flex>
      </PanelHeaderSC>
      <PanelBodySC>
        <Flex
          align="center"
          justify="space-between"
          gap="small"
        >
          <span css={{ ...theme.partials.text.subtitle2 }}>
            {formatEvalId(evaluation.id)}
          </span>
          <Chip severity={denied ? 'danger' : 'success'}>
            {denied ? 'Deny' : 'Allow'}
          </Chip>
        </Flex>
        <span
          css={{
            ...theme.partials.text.body1,
            color: theme.colors['text-long-form'],
          }}
        >
          {toolName}
          {target ? ` on ${target}` : ''}
          {evaluation.insertedAt ? ` · ${fromNow(evaluation.insertedAt)}` : ''}
        </span>
        <Subtitle1H1 css={{ marginTop: theme.spacing.large }}>
          Summary
        </Subtitle1H1>
        <span
          css={{
            ...theme.partials.text.body1,
            color: theme.colors['text-long-form'],
          }}
        >
          {getPolicyEvalReason(evaluation.output as PolicyEvalMap)}
        </span>
        <Flex
          direction="column"
          gap="medium"
          css={{ marginTop: theme.spacing.large }}
        >
          <StackedText
            first="policy Ids"
            firstPartialType="caption"
            firstColor="text-xlight"
            second={policyIds.join(', ') || '--'}
            secondPartialType="body2"
            secondColor="text"
            gap="xxsmall"
          />
          <StackedText
            first="Ids"
            firstPartialType="caption"
            firstColor="text-xlight"
            second={evaluation.id}
            secondPartialType="body2"
            secondColor="text"
            gap="xxsmall"
          />
          <StackedText
            first="Updated at"
            firstPartialType="caption"
            firstColor="text-xlight"
            second={
              evaluation.updatedAt
                ? formatDateTime(evaluation.updatedAt, 'MMMM D, YYYY')
                : '--'
            }
            secondPartialType="body2"
            secondColor="text"
            gap="xxsmall"
          />
        </Flex>
      </PanelBodySC>
    </PanelSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  overflow: 'hidden',
  borderTop: theme.borders.default,
}))

const ColumnsSC = styled.div({
  display: 'grid',
  flex: 1,
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gridTemplateRows: 'minmax(0, 1fr)',
  minHeight: 0,
  minWidth: 0,
})

const PanelSC = styled.section<{ $trimRightBorder?: boolean }>(
  ({ theme, $trimRightBorder }) => ({
    borderRight: $trimRightBorder ? undefined : theme.borders['fill-one'],
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  })
)

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

const PanelBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.small,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing.medium,
}))
